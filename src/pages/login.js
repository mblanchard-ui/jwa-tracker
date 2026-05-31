import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

const TRAINING_TYPES = [
  'Private Pilot',
  'Instrument',
  'Commercial',
  'CFI',
  'Multi Engine',
]

const STAGES = [
  'Presolo',
  'Pre-towered solo',
  'Cross country & night',
  'Finishing minimums',
  'Checkride prep',
  'Checkride ready',
]

const AV_COLORS = [
  { bg: '#dbeafe', color: '#1e40af' },
  { bg: '#d1fae5', color: '#065f46' },
  { bg: '#ede9fe', color: '#4c1d95' },
  { bg: '#fef3c7', color: '#92400e' },
  { bg: '#fee2e2', color: '#991b1b' },
]

const TRAINING_COLORS = {
  'Private Pilot': { bg: '#dbeafe', color: '#1e40af' },
  'Instrument':    { bg: '#ede9fe', color: '#4c1d95' },
  'Commercial':    { bg: '#d1fae5', color: '#065f46' },
  'CFI':           { bg: '#fef3c7', color: '#92400e' },
  'Multi Engine':  { bg: '#fee2e2', color: '#991b1b' },
}

function initials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function StageBadge({ stage }) {
  return <span className={`badge badge-${stage}`}>{STAGES[stage]}</span>
}

function TrainingBadge({ type }) {
  const c = TRAINING_COLORS[type] || TRAINING_COLORS['Private Pilot']
  return (
    <span style={{ display:'inline-block', padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:600, background:c.bg, color:c.color, whiteSpace:'nowrap' }}>
      {type || 'Private Pilot'}
    </span>
  )
}

export default function Home() {
  const router = useRouter()
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [tab, setTab] = useState('dashboard')
  const [cfis, setCfis] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [addStudentOpen, setAddStudentOpen] = useState(false)
  const [addCFIOpen, setAddCFIOpen] = useState(false)
  const [editStudent, setEditStudent] = useState(null)
  const [stageFilter, setStageFilter] = useState(null)
  const [trainingFilter, setTrainingFilter] = useState(null)
  const [searchQ, setSearchQ] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setSession(session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.push('/login')
      else setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [router])

  useEffect(() => {
    if (!session) return
    loadData()
  }, [session])

  async function loadData() {
    setLoading(true)
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    setProfile(prof)
    if (prof?.role === 'chief') {
      const { data: allCFIs } = await supabase.from('profiles').select('*').eq('role', 'cfi').order('full_name')
      setCfis(allCFIs || [])
      const { data: allStudents } = await supabase.from('students').select('*').order('full_name')
      setStudents(allStudents || [])
    } else {
      const { data: myStudents } = await supabase.from('students').select('*').eq('cfi_id', session.user.id).order('full_name')
      setStudents(myStudents || [])
    }
    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!session || loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <span style={{ color: '#6b6b66', fontSize: 14 }}>Loading...</span>
    </div>
  )

  const isChief = profile?.role === 'chief'

  const filteredStudents = students.filter(s => {
    if (stageFilter !== null && s.stage !== stageFilter) return false
    if (trainingFilter !== null && s.training_type !== trainingFilter) return false
    if (searchQ && !s.full_name.toLowerCase().includes(searchQ.toLowerCase())) return false
    return true
  })

  return (
    <>
      <nav className="nav">
        <div className="nav-logo">JWA <span>Flight</span></div>
        <div className="nav-right">
          <span className="nav-user">{profile?.full_name} · {isChief ? 'Chief Pilot' : 'CFI'}</span>
          <button className="btn-logout" onClick={handleLogout}>Sign out</button>
        </div>
      </nav>

      <div className="tabs">
        <button className={`tab-btn ${tab === 'dashboard' ? 'active' : ''}`} onClick={() => setTab('dashboard')}>Dashboard</button>
        {isChief && <button className={`tab-btn ${tab === 'cfis' ? 'active' : ''}`} onClick={() => setTab('cfis')}>Instructors</button>}
        <button className={`tab-btn ${tab === 'students' ? 'active' : ''}`} onClick={() => setTab('students')}>
          {isChief ? 'All students' : 'My students'}
        </button>
      </div>

      <div className="container page">
        {tab === 'dashboard' && isChief && <ChiefDashboardTab cfis={cfis} students={students} />}
        {tab === 'dashboard' && !isChief && <CFIDashboardTab profile={profile} students={students} onEdit={setEditStudent} />}
        {tab === 'cfis' && isChief && <CFIsTab cfis={cfis} students={students} onAddCFI={() => setAddCFIOpen(true)} onEditStudent={setEditStudent} onRefresh={loadData} />}
        {tab === 'students' && (
          <StudentsTab
            students={filteredStudents}
            allStudents={students}
            cfis={cfis}
            isChief={isChief}
            profile={profile}
            stageFilter={stageFilter}
            setStageFilter={setStageFilter}
            trainingFilter={trainingFilter}
            setTrainingFilter={setTrainingFilter}
            searchQ={searchQ}
            setSearchQ={setSearchQ}
            onAdd={() => setAddStudentOpen(true)}
            onEdit={setEditStudent}
          />
        )}
      </div>

      {addStudentOpen && (
        <AddStudentModal
          cfis={cfis}
          profile={profile}
          isChief={isChief}
          onClose={() => setAddStudentOpen(false)}
          onSave={async (data) => {
            await supabase.from('students').insert(data)
            setAddStudentOpen(false)
            loadData()
          }}
        />
      )}

      {addCFIOpen && <AddCFIModal onClose={() => setAddCFIOpen(false)} />}

      {editStudent && (
        <EditStudentModal
          student={editStudent}
          cfis={cfis}
          isChief={isChief}
          onClose={() => setEditStudent(null)}
          onSave={async (id, data) => {
            await supabase.from('students').update(data).eq('id', id)
            setEditStudent(null)
            loadData()
          }}
          onDelete={async (id) => {
            await supabase.from('students').delete().eq('id', id)
            setEditStudent(null)
            loadData()
          }}
        />
      )}
    </>
  )
}

function ChiefDashboardTab({ cfis, students }) {
  const total = students.length
  const ready = students.filter(s => s.stage === 5).length
  const prep = students.filter(s => s.stage === 4).length

  return (
    <div>
      <div className="stat-grid">
        <div className="stat-card"><div className="stat-num">{total}</div><div className="stat-lbl">Total students</div></div>
        <div className="stat-card"><div className="stat-num">{cfis.length}</div><div className="stat-lbl">Instructors</div></div>
        <div className="stat-card"><div className="stat-num">{ready}</div><div className="stat-lbl">Checkride ready</div></div>
        <div className="stat-card"><div className="stat-num">{prep}</div><div className="stat-lbl">In checkride prep</div></div>
      </div>

      <div className="section-title" style={{ marginBottom: 12 }}>By training type</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
        {TRAINING_TYPES.map(t => {
          const count = students.filter(s => (s.training_type || 'Private Pilot') === t).length
          const c = TRAINING_COLORS[t]
          return (
            <div key={t} style={{ background: c.bg, color: c.color, borderRadius: 8, padding: '8px 14px', fontSize: 13 }}>
              <span style={{ fontWeight: 600 }}>{count}</span> {t}
            </div>
          )
        })}
      </div>

      <div className="section-title" style={{ marginBottom: 12 }}>Stage breakdown</div>
      {STAGES.map((s, i) => {
        const count = students.filter(x => x.stage === i).length
        const pct = total ? Math.round(count / total * 100) : 0
        return (
          <div key={i} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <StageBadge stage={i} />
              <span style={{ fontSize: 12, color: '#6b6b66' }}>{count} student{count !== 1 ? 's' : ''}</span>
            </div>
            <div className="progress-wrap"><div className="progress-bar" style={{ width: pct + '%' }} /></div>
          </div>
        )
      })}

      {ready > 0 && (
        <>
          <div className="section-title" style={{ margin: '24px 0 12px' }}>Checkride-ready students</div>
          {students.filter(s => s.stage === 5).map((s, i) => (
            <div key={s.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="avatar" style={AV_COLORS[i % 5]}>{initials(s.full_name)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{s.full_name}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                  <TrainingBadge type={s.training_type || 'Private Pilot'} />
                  <StageBadge stage={5} />
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

function CFIDashboardTab({ profile, students, onEdit }) {
  const total = students.length
  const ready = students.filter(s => s.stage === 5).length
  const prep = students.filter(s => s.stage === 4).length
  const presolo = students.filter(s => s.stage === 0).length

  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, color: '#001f3f' }}>
        Welcome, {profile?.full_name}
      </div>

      <div className="stat-grid">
        <div className="stat-card"><div className="stat-num">{total}</div><div className="stat-lbl">My students</div></div>
        <div className="stat-card"><div className="stat-num">{ready}</div><div className="stat-lbl">Checkride ready</div></div>
        <div className="stat-card"><div className="stat-num">{prep}</div><div className="stat-lbl">Checkride prep</div></div>
        <div className="stat-card"><div className="stat-num">{presolo}</div><div className="stat-lbl">Presolo</div></div>
      </div>

      <div className="section-title" style={{ marginBottom: 12 }}>My students by stage</div>
      {STAGES.map((s, i) => {
        const stageStudents = students.filter(x => x.stage === i)
        const pct = total ? Math.round(stageStudents.length / total * 100) : 0
        return (
          <div key={i} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <StageBadge stage={i} />
              <span style={{ fontSize: 12, color: '#6b6b66' }}>{stageStudents.length} student{stageStudents.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="progress-wrap"><div className="progress-bar" style={{ width: pct + '%' }} /></div>
            {stageStudents.length > 0 && (
              <div style={{ marginTop: 6, paddingLeft: 4 }}>
                {stageStudents.map((st, si) => (
                  <div
                    key={st.id}
                    onClick={() => onEdit(st)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 7, cursor: 'pointer', marginBottom: 2 }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f4f4f0'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div className="avatar" style={{ ...AV_COLORS[si % 5], width: 28, height: 28, fontSize: 10 }}>{initials(st.full_name)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{st.full_name}</div>
                      {st.notes && <div style={{ fontSize: 11, color: '#6b6b66', fontStyle: 'italic' }}>{st.notes}</div>}
                    </div>
                    <TrainingBadge type={st.training_type || 'Private Pilot'} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {ready > 0 && (
        <>
          <div className="section-title" style={{ margin: '8px 0 12px' }}>Ready for checkride</div>
          {students.filter(s => s.stage === 5).map((s, i) => (
            <div key={s.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => onEdit(s)}>
              <div className="avatar" style={AV_COLORS[i % 5]}>{initials(s.full_name)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{s.full_name}</div>
                <TrainingBadge type={s.training_type || 'Private Pilot'} />
              </div>
              <StageBadge stage={5} />
            </div>
          ))}
        </>
      )}

      {total === 0 && (
        <div className="empty">No students yet — go to My students to add your first one.</div>
      )}
    </div>
  )
}

function CFIsTab({ cfis, students, onAddCFI, onEditStudent }) {
  const [expanded, setExpanded] = useState(null)

  return (
    <div>
      <div className="section-header">
        <span className="section-title">Instructors ({cfis.length})</span>
        <button className="btn btn-sm" onClick={onAddCFI}>+ Add CFI</button>
      </div>
      {cfis.length === 0 && <div className="empty">No instructors yet.</div>}
      {cfis.map((cfi, ci) => {
        const myStudents = students.filter(s => s.cfi_id === cfi.id)
        const isOpen = expanded === cfi.id
        return (
          <div key={cfi.id} className="card" style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => setExpanded(isOpen ? null : cfi.id)}>
              <div className="avatar" style={AV_COLORS[ci % 5]}>{initials(cfi.full_name)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{cfi.full_name}</div>
                <div style={{ fontSize: 12, color: '#6b6b66' }}>{myStudents.length} student{myStudents.length !== 1 ? 's' : ''}{cfi.cert_number ? ' · ' + cfi.cert_number : ''}</div>
              </div>
              <span style={{ fontSize: 18, color: '#6b6b66' }}>{isOpen ? '▲' : '▼'}</span>
            </div>
            {isOpen && (
              <div style={{ marginTop: 12, borderTop: '1px solid #e2e1da', paddingTop: 12 }}>
                {myStudents.length === 0 && <div style={{ fontSize: 13, color: '#6b6b66' }}>No students assigned.</div>}
                {myStudents.map(s => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f0f0ea', cursor: 'pointer' }} onClick={() => onEditStudent(s)}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{s.full_name}</div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                        <TrainingBadge type={s.training_type || 'Private Pilot'} />
                      </div>
                      {s.notes && <div style={{ fontSize: 11, color: '#6b6b66', fontStyle: 'italic', marginTop: 2 }}>{s.notes}</div>}
                    </div>
                    <StageBadge stage={s.stage} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function StudentsTab({ students, allStudents, cfis, isChief, profile, stageFilter, setStageFilter, trainingFilter, setTrainingFilter, searchQ, setSearchQ, onAdd, onEdit }) {
  return (
    <div>
      <div className="section-header">
        <span className="section-title">{isChief ? 'All students' : 'My students'} ({students.length})</span>
        <button className="btn btn-primary btn-sm" onClick={onAdd}>+ Add student</button>
      </div>
      <input className="search-input" placeholder="Search by name..." value={searchQ} onChange={e => setSearchQ(e.target.value)} />
      <div style={{ fontSize: 12, color: '#6b6b66', marginBottom: 4 }}>Filter by stage</div>
      <div className="filter-row">
        <button className={`filter-pill ${stageFilter === null ? 'active' : ''}`} onClick={() => setStageFilter(null)}>All</button>
        {STAGES.map((s, i) => (
          <button key={i} className={`filter-pill ${stageFilter === i ? 'active' : ''}`} onClick={() => setStageFilter(i)}>{s}</button>
        ))}
      </div>
      <div style={{ fontSize: 12, color: '#6b6b66', marginBottom: 4 }}>Filter by training type</div>
      <div className="filter-row" style={{ marginBottom: 14 }}>
        <button className={`filter-pill ${trainingFilter === null ? 'active' : ''}`} onClick={() => setTrainingFilter(null)}>All</button>
        {TRAINING_TYPES.map(t => (
          <button key={t} className={`filter-pill ${trainingFilter === t ? 'active' : ''}`} onClick={() => setTrainingFilter(t)}>{t}</button>
        ))}
      </div>
      {students.length === 0 && <div className="empty">No students found.</div>}
      {students.map((s, i) => {
        const cfi = cfis.find(c => c.id === s.cfi_id)
        const updated = s.updated_at ? new Date(s.updated_at).toLocaleDateString() : null
        return (
          <div key={s.id} className="card" style={{ cursor: 'pointer' }} onClick={() => onEdit(s)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="avatar" style={AV_COLORS[allStudents.indexOf(s) % 5]}>{initials(s.full_name)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{s.full_name}</div>
                <div style={{ fontSize: 12, color: '#6b6b66' }}>
                  {isChief && cfi ? cfi.full_name + ' · ' : ''}{updated ? 'Updated ' + updated : ''}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                  <TrainingBadge type={s.training_type || 'Private Pilot'} />
                  <StageBadge stage={s.stage} />
                </div>
                {s.notes && <div style={{ fontSize: 11, color: '#6b6b66', fontStyle: 'italic', marginTop: 2 }}>{s.notes}</div>}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function AddStudentModal({ cfis, profile, isChief, onClose, onSave }) {
  const [name, setName] = useState('')
  const [cfiId, setCfiId] = useState(isChief ? (cfis[0]?.id || '') : profile?.id)
  const [stage, setStage] = useState(0)
  const [trainingType, setTrainingType] = useState('Private Pilot')
  const [notes, setNotes] = useState('')

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>Add student</h3>
        <div className="form-group"><label>Full name</label><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Marcus Williams" /></div>
        {isChief && (
          <div className="form-group">
            <label>Assigned CFI</label>
            <select value={cfiId} onChange={e => setCfiId(e.target.value)}>
              {cfis.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
          </div>
        )}
        <div className="form-group">
          <label>Training type</label>
          <select value={trainingType} onChange={e => setTrainingType(e.target.value)}>
            {TRAINING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Current stage</label>
          <select value={stage} onChange={e => setStage(parseInt(e.target.value))}>
            {STAGES.map((s, i) => <option key={i} value={i}>{s}</option>)}
          </select>
        </div>
        <div className="form-group"><label>Notes (optional)</label><input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Working on crosswind landings" /></div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => name && onSave({ full_name: name, cfi_id: cfiId || profile?.id, stage, training_type: trainingType, notes })}>Save</button>
        </div>
      </div>
    </div>
  )
}

function EditStudentModal({ student, cfis, isChief, onClose, onSave, onDelete }) {
  const [name, setName] = useState(student.full_name)
  const [cfiId, setCfiId] = useState(student.cfi_id)
  const [stage, setStage] = useState(student.stage)
  const [trainingType, setTrainingType] = useState(student.training_type || 'Private Pilot')
  const [notes, setNotes] = useState(student.notes || '')

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>Edit student</h3>
        <div className="form-group"><label>Full name</label><input value={name} onChange={e => setName(e.target.value)} /></div>
        {isChief && (
          <div className="form-group">
            <label>Assigned CFI</label>
            <select value={cfiId} onChange={e => setCfiId(e.target.value)}>
              {cfis.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
          </div>
        )}
        <div className="form-group">
          <label>Training type</label>
          <select value={trainingType} onChange={e => setTrainingType(e.target.value)}>
            {TRAINING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Stage</label>
          <select value={stage} onChange={e => setStage(parseInt(e.target.value))}>
            {STAGES.map((s, i) => <option key={i} value={i}>{s}</option>)}
          </select>
        </div>
        <div className="form-group"><label>Notes</label><input value={notes} onChange={e => setNotes(e.target.value)} /></div>
        <div className="modal-footer">
          <button className="btn btn-danger btn-sm" onClick={() => confirm('Delete this student?') && onDelete(student.id)}>Delete</button>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(student.id, { full_name: name, cfi_id: cfiId, stage, training_type: trainingType, notes })}>Save</button>
        </div>
      </div>
    </div>
  )
}

function AddCFIModal({ onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>Adding CFI accounts</h3>
        <p style={{ fontSize: 14, color: '#6b6b66', lineHeight: 1.6, marginBottom: 16 }}>
          To add a new CFI, go to your <strong>Supabase dashboard</strong> → Authentication → Users → Add user. Enter their email and password, then run this in the SQL editor:
        </p>
        <code style={{ display: 'block', background: '#f4f4f0', padding: 12, borderRadius: 8, fontSize: 12, marginBottom: 16 }}>
          {`INSERT INTO profiles (id, full_name, role)\nSELECT id, 'CFI Name', 'cfi'\nFROM auth.users\nWHERE email = 'cfi@email.com';`}
        </code>
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>
  )
}
