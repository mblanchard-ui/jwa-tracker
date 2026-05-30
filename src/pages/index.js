import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

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

function initials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function StageBadge({ stage }) {
  return <span className={`badge badge-${stage}`}>{STAGES[stage]}</span>
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
        {isChief && <button className={`tab-btn ${tab === 'dashboard' ? 'active' : ''}`} onClick={() => setTab('dashboard')}>Dashboard</button>}
        {isChief && <button className={`tab-btn ${tab === 'cfis' ? 'active' : ''}`} onClick={() => setTab('cfis')}>Instructors</button>}
        <button className={`tab-btn ${tab === 'students' ? 'active' : ''}`} onClick={() => setTab('students')}>
          {isChief ? 'All students' : 'My students'}
        </button>
      </div>

      <div className="container page">
        {tab === 'dashboard' && isChief && <DashboardTab cfis={cfis} students={students} />}
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

function DashboardTab({ cfis, students }) {
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
          <div className="section-title" style={{ margin: '24px 0 12px'
