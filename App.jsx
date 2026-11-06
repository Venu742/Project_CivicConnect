import { useEffect, useMemo, useState } from 'react'
import './App.css'

const STORAGE_KEY = 'civicReports'

const EMPTY_COMPLAINT = {
  name: '',
  title: '',
  category: '',
  description: '',
  location: '',
}

const DEPARTMENTS = [
  'Not Assigned',
  'Road Department',
  'Electricity Department',
  'Sanitation Department',
  'Water Department',
  'General Department',
]

const PRIORITIES = ['High', 'Medium', 'Low']
const STATUSES = ['Pending', 'In Progress', 'Resolved']

function normalizeDuplicateField(value) {
  return String(value ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
}

function isSameComplaint(a, b) {
  return (
    normalizeDuplicateField(a.title) === normalizeDuplicateField(b.title) &&
    normalizeDuplicateField(a.category) === normalizeDuplicateField(b.category) &&
    normalizeDuplicateField(a.location) === normalizeDuplicateField(b.location)
  )
}

function findDuplicateComplaint(complaint, reports) {
  return reports.find((report) => isSameComplaint(report, complaint))
}

function getOriginalDuplicate(report, reports) {
  const index = reports.findIndex((item) => item.id === report.id)

  if (index <= 0) return null

  return reports
    .slice(0, index)
    .find((item) => isSameComplaint(item, report)) || null
}

function readReports() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    const parsed = saved ? JSON.parse(saved) : []
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.error('Could not read saved complaints:', error)
    return []
  }
}

function getDefaultPriority(title, description, category) {
  const text = `${title} ${description} ${category}`.toLowerCase()

  const highKeywords = [
    'accident', 'danger', 'dangerous', 'emergency', 'fire', 'flood',
    'electric shock', 'exposed wire', 'live wire', 'open manhole',
    'severe pothole', 'major road damage', 'water contamination',
    'burst pipe', 'building collapse', 'injury', 'life threatening',
  ]

  const mediumKeywords = [
    'pothole', 'road damage', 'streetlight', 'street light', 'garbage',
    'drainage', 'water leakage', 'water supply', 'broken', 'overflow',
    'blocked drain', 'not working', 'waste',
  ]

  if (highKeywords.some((keyword) => text.includes(keyword))) return 'High'
  if (mediumKeywords.some((keyword) => text.includes(keyword))) return 'Medium'
  return 'Low'
}

function saveReports(reports) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports))
    return true
  } catch (error) {
    console.error('Could not save complaints:', error)
    alert('The complaint data could not be saved. Your browser storage may be full.')
    return false
  }
}

function App() {
  const [showForm, setShowForm] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [complaint, setComplaint] = useState(EMPTY_COMPLAINT)
  const [photo, setPhoto] = useState(null)
  const [photoError, setPhotoError] = useState('')
  const [locationCoords, setLocationCoords] = useState(null)
  const [locationMessage, setLocationMessage] = useState('')
  const [trackId, setTrackId] = useState('')
  const [trackedReport, setTrackedReport] = useState(null)
  const [trackError, setTrackError] = useState('')
  const [submittedReportId, setSubmittedReportId] = useState(null)

  const [showAdminLogin, setShowAdminLogin] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [loginError, setLoginError] = useState('')

  const [reports, setReports] = useState(readReports)

  useEffect(() => {
    saveReports(reports)
  }, [reports])

  // Keep the tracking panel current if an administrator changes a report.
  useEffect(() => {
    if (trackedReport) {
      const current = reports.find((report) => report.id === trackedReport.id)
      setTrackedReport(current || null)
    }
    // Intentionally respond only to report changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reports])

  const pendingCount = useMemo(
    () => reports.filter((report) => report.status === 'Pending').length,
    [reports]
  )
  const progressCount = useMemo(
    () => reports.filter((report) => report.status === 'In Progress').length,
    [reports]
  )
  const resolvedCount = useMemo(
    () => reports.filter((report) => report.status === 'Resolved').length,
    [reports]
  )

  const handleChange = (event) => {
    const { name, value } = event.target
    setComplaint((current) => ({ ...current, [name]: value }))
  }

  const openComplaintForm = (category = '') => {
    setComplaint({ ...EMPTY_COMPLAINT, category })
    setPhoto(null)
    setPhotoError('')
    setLocationCoords(null)
    setLocationMessage('')
    setSubmitted(false)
    setShowForm(true)
  }

  const closeComplaintForm = () => {
    setShowForm(false)
    setSubmitted(false)
  }

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage('Geolocation is not supported by your browser.')
      return
    }

    setLocationMessage('Detecting your location…')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
        setLocationMessage('Location detected successfully.')
      },
      (error) => {
        console.error('Geolocation error:', error)
        setLocationMessage('Unable to detect location. Please allow location access or enter the location manually.')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0]
    setPhotoError('')

    if (!file) {
      setPhoto(null)
      return
    }

    if (!file.type.startsWith('image/')) {
      setPhotoError('Please choose an image file.')
      event.target.value = ''
      setPhoto(null)
      return
    }

    // Keep localStorage usage manageable. The app is a front-end demo.
    if (file.size > 2 * 1024 * 1024) {
      setPhotoError('Please choose an image smaller than 2 MB.')
      event.target.value = ''
      setPhoto(null)
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setPhoto({
        name: file.name,
        dataUrl: typeof reader.result === 'string' ? reader.result : '',
      })
    }
    reader.onerror = () => {
      setPhotoError('The image could not be read. Please try another file.')
      setPhoto(null)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const duplicate = findDuplicateComplaint(complaint, reports)

if (duplicate) {
  const continueSubmission = window.confirm(
    `A similar complaint already exists!\n\n` +
    `Existing Complaint ID: ${duplicate.id}\n\n` +
    `Do you still want to submit this complaint?`
  )

  if (!continueSubmission) return
}

    const newReport = {
      ...complaint,
      latitude: locationCoords?.latitude ?? '',
      longitude: locationCoords?.longitude ?? '',
      photo: photo?.name ?? '',
      photoDataUrl: photo?.dataUrl ?? '',
      id: Date.now(),
      status: 'Pending',
      department: 'Not Assigned',
      priority: getDefaultPriority(
        complaint.title,
        complaint.description,
        complaint.category
      ),
      date: new Date().toLocaleDateString(),
    }

    const updatedReports = [...reports, newReport]
    if (!saveReports(updatedReports)) return

    setReports(updatedReports)
    setSubmittedReportId(newReport.id)
    setSubmitted(true)
    setComplaint(EMPTY_COMPLAINT)
    setPhoto(null)
    setLocationCoords(null)
    setLocationMessage('')
  }

  const handleTrack = (event) => {
    event.preventDefault()
    const found = reports.find(
      (report) => String(report.id) === trackId.trim()
    )

    if (found) {
      setTrackedReport(found)
      setTrackError('')
    } else {
      setTrackedReport(null)
      setTrackError('Complaint ID not found. Please check your ID.')
    }
  }

  // Demo-only login. Do not use hardcoded credentials for a production system.
  const handleAdminLogin = (event) => {
    event.preventDefault()

    if (
      adminEmail.trim().toLowerCase() === 'admin@civicconnect.com' &&
      adminPassword === 'admin123'
    ) {
      setIsAdmin(true)
      setShowAdminLogin(false)
      setLoginError('')
      setAdminEmail('')
      setAdminPassword('')
    } else {
      setLoginError('Invalid email or password.')
    }
  }

  const updateReport = (id, changes) => {
    setReports((current) => {
      const updated = current.map((report) =>
        report.id === id ? { ...report, ...changes } : report
      )
      return updated
    })
  }

  const updateStatus = (id, status) => updateReport(id, { status })
  const assignDepartment = (id, department) => updateReport(id, { department })
  const updatePriority = (id, priority) => updateReport(id, { priority })

  const deleteReport = (id) => {
    if (!window.confirm('Are you sure you want to delete this complaint?')) return
    setReports((current) => {
      const updated = current.filter((report) => report.id !== id)
      return updated
    })
    if (trackedReport?.id === id) {
      setTrackedReport(null)
      setTrackId('')
    }
  }

  const sortedReports = [...reports].sort((a, b) => {
    const order = { High: 1, Medium: 2, Low: 3 }
    return (order[a.priority || 'Medium'] || 2) - (order[b.priority || 'Medium'] || 2)
  })

  return (
    <div className="app">
      <nav className="navbar">
        <a className="brand" href="#home" onClick={() => setIsAdmin(false)}>
          <h2>🏙️ CivicConnect</h2>
        </a>

        <div className="nav-actions">
          <a href="#home" onClick={() => setIsAdmin(false)}>Home</a>
          <a href="#services" onClick={() => setIsAdmin(false)}>Services</a>
          <button
            className="admin-nav-btn"
            onClick={() => {
              if (isAdmin) {
                setIsAdmin(false)
              } else {
                setShowAdminLogin(true)
                setLoginError('')
              }
            }}
          >
            {isAdmin ? 'Logout Admin' : 'Admin'}
          </button>
          <button onClick={() => {
            setIsAdmin(false)
            openComplaintForm()
          }}>
            Report Issue
          </button>
        </div>
      </nav>

      {isAdmin ? (
        <section className="admin-dashboard">
          <div className="dashboard-heading">
            <div>
              <p className="eyebrow">CIVICCONNECT CONTROL PANEL</p>
              <h1>Admin Dashboard</h1>
              <p>Manage community complaints and track their progress.</p>
            </div>
            <button className="secondary-btn" onClick={() => setIsAdmin(false)}>
              Back to Website
            </button>
          </div>

          <div className="admin-stats">
            <div><h2>{reports.length}</h2><p>Total Reports</p></div>
            <div><h2>{pendingCount}</h2><p>Pending</p></div>
            <div><h2>{progressCount}</h2><p>In Progress</p></div>
            <div><h2>{resolvedCount}</h2><p>Resolved</p></div>
          </div>

          <h2 className="complaints-heading">Manage Complaints</h2>

          {reports.length === 0 ? (
            <p className="no-reports">No complaints have been submitted yet.</p>
          ) : (
            <div className="complaints-list">
              {sortedReports.map((report) => (
                <article className="complaint-card" key={report.id}>
                  <div className="complaint-card-heading">
                    <h3>{report.title}</h3>
                    <span className={`priority priority-${(report.priority || 'Medium').toLowerCase()}`}>
                      {report.priority || 'Medium'} Priority
                    </span>
                  </div>
                  {getOriginalDuplicate(report, reports) && (
  <div className="duplicate-alert">
    ⚠️ <strong>Possible Duplicate Complaint</strong>
    <p>
      Original Complaint ID:{' '}
      {getOriginalDuplicate(report, reports).id}
    </p>
  </div>
)}

                  <p><strong>Complaint ID:</strong> {report.id}</p>
                  <p><strong>Name:</strong> {report.name}</p>
                  <p><strong>Category:</strong> {report.category}</p>
                  <p><strong>Description:</strong> {report.description}</p>
                  <p><strong>Location:</strong> {report.location}</p>
                  {report.latitude !== '' && report.longitude !== '' && (
                    <p>
                      <strong>Map Location:</strong>{' '}
                      <a
                        href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        📍 View on Google Maps
                      </a>
                    </p>
                  )}
                  <p><strong>Date:</strong> {report.date}</p>
                  {report.photoDataUrl && (
                    <img className="complaint-photo" src={report.photoDataUrl} alt={`Evidence for ${report.title}`} />
                  )}
                  <p><strong>Photo:</strong> {report.photo || 'Not uploaded'}</p>

                  <div className="status-control">
                    <label>
                      Update Status
                      <select
                        value={report.status || 'Pending'}
                        onChange={(event) => updateStatus(report.id, event.target.value)}
                      >
                        {STATUSES.map((status) => <option key={status}>{status}</option>)}
                      </select>
                    </label>

                    <label>
                      Assign Department
                      <select
                        value={report.department || 'Not Assigned'}
                        onChange={(event) => assignDepartment(report.id, event.target.value)}
                      >
                        {DEPARTMENTS.map((department) => <option key={department}>{department}</option>)}
                      </select>
                    </label>

                    <label>
                      Priority
                      <select
                        value={report.priority || 'Medium'}
                        onChange={(event) => updatePriority(report.id, event.target.value)}
                      >
                        {PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}
                      </select>
                    </label>

                    <button
  className="delete-btn"
  onClick={() => deleteReport(report.id)}
>
  {getOriginalDuplicate(report, reports)
    ? 'Remove Duplicate'
    : 'Delete'}
</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          <section className="hero" id="home">
            <p className="eyebrow">BUILDING BETTER COMMUNITIES</p>
            <h1>Your City, Your Voice.</h1>
            <p>Report local problems, track their progress<br className="desktop-break" /> and help make your community better.</p>
            <button className="hero-button" onClick={() => openComplaintForm()}>
              + Report a Problem
            </button>
          </section>

          <section className="stats">
            <div><h2>{reports.length}</h2><p>Reports Received</p></div>
            <div><h2>{resolvedCount}</h2><p>Problems Resolved</p></div>
            <div><h2>{pendingCount + progressCount}</h2><p>Pending / In Progress</p></div>
          </section>

          <section className="tracking-section">
            <div className="section-heading">
              <p className="eyebrow">STAY UPDATED</p>
              <h2>Track Your Complaint</h2>
              <p>Enter your Complaint ID to check the latest status.</p>
            </div>

            <form onSubmit={handleTrack} className="tracking-form">
              <input
                type="text"
                value={trackId}
                onChange={(event) => setTrackId(event.target.value)}
                placeholder="Enter your Complaint ID"
                aria-label="Complaint ID"
                required
              />
              <button type="submit">Track Complaint</button>
            </form>

            {trackError && <p className="track-error" role="alert">{trackError}</p>}

            {trackedReport && (
              <div className="tracking-result">
                <h3>Complaint Details</h3>
                <p><strong>Complaint ID:</strong> {trackedReport.id}</p>
                <p><strong>Title:</strong> {trackedReport.title}</p>
                <p><strong>Category:</strong> {trackedReport.category}</p>
                <p><strong>Location:</strong> {trackedReport.location}</p>
                {trackedReport.latitude !== '' && trackedReport.longitude !== '' && (
                  <p>
                    <strong>Map Location:</strong>{' '}
                    <a
                      href={`https://www.google.com/maps?q=${trackedReport.latitude},${trackedReport.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      📍 View on Google Maps
                    </a>
                  </p>
                )}
                <p><strong>Date:</strong> {trackedReport.date}</p>
                <p><strong>Department:</strong> {trackedReport.department || 'Not Assigned'}</p>
                <p>
                  <strong>Status:</strong>{' '}
                  <span className={`status-pill status-${(trackedReport.status || 'Pending').toLowerCase().replaceAll(' ', '-')}`}>
                    {trackedReport.status || 'Pending'}
                  </span>
                </p>
              </div>
            )}
          </section>

          <section className="services" id="services">
            <div className="section-heading">
              <p className="eyebrow">HOW CAN WE HELP?</p>
              <h2>What would you like to report?</h2>
              <p>Choose an issue category to get started.</p>
            </div>

            <div className="categories">
              <button className="category-card" onClick={() => openComplaintForm('Road Problems')}>
                <span>🚧</span><h3>Road Problems</h3><p>Potholes and damaged roads</p>
              </button>
              <button className="category-card" onClick={() => openComplaintForm('Streetlights')}>
                <span>💡</span><h3>Streetlights</h3><p>Broken or faulty streetlights</p>
              </button>
              <button className="category-card" onClick={() => openComplaintForm('Garbage')}>
                <span>🗑️</span><h3>Garbage</h3><p>Waste management issues</p>
              </button>
              <button className="category-card" onClick={() => openComplaintForm('Water Problems')}>
                <span>💧</span><h3>Water Problems</h3><p>Water leakage and supply</p>
              </button>
            </div>
          </section>
        </>
      )}

      {showAdminLogin && (
        <div className="modal" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setShowAdminLogin(false)
        }}>
          <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="admin-login-title">
            <button className="close" type="button" onClick={() => setShowAdminLogin(false)} aria-label="Close">
              ✕
            </button>
            <form onSubmit={handleAdminLogin}>
              <h2 id="admin-login-title">🔐 Admin Login</h2>
              <label htmlFor="admin-email">Admin Email</label>
              <input
                id="admin-email"
                type="email"
                value={adminEmail}
                onChange={(event) => setAdminEmail(event.target.value)}
                placeholder="Enter admin email"
                autoComplete="username"
                required
              />
              <label htmlFor="admin-password">Password</label>
              <input
                id="admin-password"
                type="password"
                value={adminPassword}
                onChange={(event) => setAdminPassword(event.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
                required
              />
              {loginError && <p className="login-error" role="alert">{loginError}</p>}
              <button type="submit">Login</button>
              <p className="demo-note">Demo credentials are listed in the project README. This login is not secure for production.</p>
            </form>
          </div>
        </div>
      )}

      {showForm && (
        <div className="modal" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeComplaintForm()
        }}>
          <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="report-form-title">
            <button className="close" type="button" onClick={closeComplaintForm} aria-label="Close">
              ✕
            </button>

            {submitted ? (
              <div className="success-panel">
                <div className="success-icon">✓</div>
                <h2>Report Submitted!</h2>
                <p>Your complaint has been successfully registered.</p>
                <p className="complaint-id-label">Your Complaint ID</p>
                <h3 className="submitted-id">{submittedReportId}</h3>
                <p>Please save this ID to track your complaint.</p>
                <button onClick={closeComplaintForm}>Done</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <p className="eyebrow">MAKE YOUR VOICE HEARD</p>
                <h2 id="report-form-title">Report a Problem</h2>

                <label htmlFor="complaint-name">Your Name</label>
                <input
                  id="complaint-name"
                  name="name"
                  value={complaint.name}
                  onChange={handleChange}
                  placeholder="Enter your name"
                  required
                />

                <label htmlFor="complaint-title">Problem Title</label>
                <input
                  id="complaint-title"
                  name="title"
                  value={complaint.title}
                  onChange={handleChange}
                  placeholder="Example: Road pothole"
                  required
                />

                <label htmlFor="complaint-category">Problem Category</label>
                <select
                  id="complaint-category"
                  name="category"
                  value={complaint.category}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select category</option>
                  <option>Road Problems</option>
                  <option>Streetlights</option>
                  <option>Garbage</option>
                  <option>Water Problems</option>
                  <option>Other</option>
                </select>

                <label htmlFor="complaint-description">Description</label>
                <textarea
                  id="complaint-description"
                  name="description"
                  value={complaint.description}
                  onChange={handleChange}
                  placeholder="Describe the problem…"
                  rows="4"
                  required
                />

                <label htmlFor="complaint-location">Location</label>
                <input
                  id="complaint-location"
                  name="location"
                  value={complaint.location}
                  onChange={handleChange}
                  placeholder="Enter problem location"
                  required
                />

                <button className="location-btn" type="button" onClick={handleGetLocation}>
                  📍 Detect My Current Location
                </button>
                {locationMessage && (
                  <p className={locationCoords ? 'location-success' : 'form-hint'}>{locationMessage}</p>
                )}
                {locationCoords && (
                  <p className="form-hint">
                    Coordinates: {locationCoords.latitude.toFixed(5)}, {locationCoords.longitude.toFixed(5)}
                  </p>
                )}

                <label htmlFor="complaint-photo">Upload Photograph (optional, max 2 MB)</label>
                <input
                  id="complaint-photo"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                />
                {photo?.name && <p className="form-hint">Selected: {photo.name}</p>}
                {photoError && <p className="track-error" role="alert">{photoError}</p>}

                <button type="submit" disabled={Boolean(photoError)}>
                  Submit Complaint
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      <footer>
        <p>© 2026 CivicConnect | Together for a Better Community</p>
      </footer>
    </div>
  )
}

export default App
