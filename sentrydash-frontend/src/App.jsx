import React, { useState, useEffect } from 'react';
import { X, Search, Wifi, Monitor, Users, MapPin, AlertCircle, LogOut } from 'lucide-react';
import './App.css';

const API_BASE_URL = 'http://localhost:3000/api';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogout = () => {
    setCurrentUser(null);
  };

  if (!currentUser) {
    return <LoginPage onLogin={setCurrentUser} loading={loading} setLoading={setLoading} />;
  }

  return (
    <div className="app">
      <Header user={currentUser} onLogout={handleLogout} />
      <main className="main-content">
        {currentUser.role === 'teacher' ? (
          <TeacherDashboard user={currentUser} />
        ) : (
          <StudentDashboard user={currentUser} />
        )}
      </main>
    </div>
  );
}

// Login Page Component
function LoginPage({ onLogin, loading, setLoading }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Login failed');
      }

      const data = await response.json();
      onLogin(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">🏫 SentryDash</h1>
          <p className="login-subtitle">Classroom Occupancy Monitoring System</p>
        </div>

        <div className="login-form">
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email Address</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
            />
          </div>

          {error && (
            <div className="error-message">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button onClick={handleSubmit} className="btn btn-primary btn-login" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </div>

        <div className="login-footer">
          <p className="login-help">Enter your registered email to access the dashboard</p>
        </div>
      </div>
    </div>
  );
}

// Header Component
function Header({ user, onLogout }) {
  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">🏫 SentryDash</div>
        <div className="header-user">
          <div className="user-info">
            <span className="user-name">{user.profile.name}</span>
            <span className="user-role">{user.role}</span>
          </div>
          <button className="btn-logout" onClick={onLogout}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}

// Student Dashboard Component
function StudentDashboard({ user }) {
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/rooms`);
      if (!response.ok) throw new Error('Failed to fetch rooms');
      const data = await response.json();
      setRooms(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRoomClick = async (roomId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/room/${roomId}`);
      if (!response.ok) throw new Error('Failed to fetch room details');
      const data = await response.json();
      setSelectedRoom(data);
    } catch (err) {
      console.error('Error fetching room:', err);
    }
  };

  const handleEntry = async (roomId, action) => {
    try {
      const response = await fetch(`${API_BASE_URL}/entry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          roomId, 
          action, 
          userId: user.profile.id 
        })
      });
      if (!response.ok) throw new Error('Failed to update entry');
      await fetchRooms();
      if (selectedRoom) {
        await handleRoomClick(roomId);
      }
    } catch (err) {
      console.error('Error updating entry:', err);
    }
  };

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         room.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || room.type === filterType;
    return matchesSearch && matchesType;
  });

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={fetchRooms} />;

  return (
    <>
      <div className="dashboard-header">
        <h1 className="dashboard-title">Room Occupancy Dashboard</h1>
        <p className="dashboard-subtitle">Monitor classroom capacities in real-time</p>
      </div>

      <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
      <FilterTabs filterType={filterType} setFilterType={setFilterType} />

      <div className="rooms-grid">
        {filteredRooms.map(room => (
          <RoomCard key={room.id} room={room} onClick={() => handleRoomClick(room.id)} />
        ))}
      </div>

      {filteredRooms.length === 0 && (
        <div className="empty-state">
          <p>No rooms found matching your criteria</p>
        </div>
      )}

      {selectedRoom && (
        <RoomDetailModal
          room={selectedRoom}
          onClose={() => setSelectedRoom(null)}
          onEntry={handleEntry}
          showEntryButtons={true}
        />
      )}
    </>
  );
}

// Teacher Dashboard Component
function TeacherDashboard({ user }) {
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [reservationResult, setReservationResult] = useState(null);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/rooms`);
      if (!response.ok) throw new Error('Failed to fetch rooms');
      const data = await response.json();
      setRooms(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRoomClick = async (roomId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/room/${roomId}`);
      if (!response.ok) throw new Error('Failed to fetch room details');
      const data = await response.json();
      setSelectedRoom(data);
    } catch (err) {
      console.error('Error fetching room:', err);
    }
  };

  const handleReserve = (room) => {
    setSelectedRoom(room);
    setShowReserveModal(true);
  };

  const submitReservation = async (reservationData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/reserve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...reservationData,
          teacherId: user.profile.id
        })
      });
      if (!response.ok) throw new Error('Failed to reserve room');
      const result = await response.json();
      setReservationResult(result);
      await fetchRooms();
    } catch (err) {
      console.error('Error reserving room:', err);
      alert('Failed to reserve room: ' + err.message);
    }
  };

  const handleSuggest = async (roomId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId })
      });
      if (!response.ok) throw new Error('Failed to get suggestion');
      const data = await response.json();
      
      if (data.suggestion) {
        alert(`Suggested alternate room: ${data.suggestion.name} (${data.suggestion.id})\nAvailable capacity: ${data.suggestion.available}\nDistance: ${data.suggestion.distance.toFixed(2)} units`);
      } else {
        alert('No suitable alternate rooms found');
      }
    } catch (err) {
      console.error('Error getting suggestion:', err);
    }
  };

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         room.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || room.type === filterType;
    return matchesSearch && matchesType;
  });

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={fetchRooms} />;

  return (
    <>
      <div className="dashboard-header">
        <h1 className="dashboard-title">Teacher Dashboard</h1>
        <p className="dashboard-subtitle">Manage classroom reservations and monitor occupancy</p>
      </div>

      <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
      <FilterTabs filterType={filterType} setFilterType={setFilterType} />

      <div className="rooms-grid">
        {filteredRooms.map(room => (
          <TeacherRoomCard 
            key={room.id} 
            room={room} 
            onClick={() => handleRoomClick(room.id)}
            onReserve={() => handleReserve(room)}
            onSuggest={() => handleSuggest(room.id)}
          />
        ))}
      </div>

      {filteredRooms.length === 0 && (
        <div className="empty-state">
          <p>No rooms found matching your criteria</p>
        </div>
      )}

      {selectedRoom && !showReserveModal && (
        <RoomDetailModal
          room={selectedRoom}
          onClose={() => setSelectedRoom(null)}
          showEntryButtons={false}
        />
      )}

      {showReserveModal && selectedRoom && (
        <ReserveModal
          room={selectedRoom}
          onClose={() => {
            setShowReserveModal(false);
            setReservationResult(null);
          }}
          onSubmit={submitReservation}
          result={reservationResult}
        />
      )}
    </>
  );
}

// Teacher Room Card Component
function TeacherRoomCard({ room, onClick, onReserve, onSuggest }) {
  const occupancyPercentage = (room.currentCount / room.capacity) * 100;
  const isOverCapacity = room.currentCount > room.capacity;

  const getCapacityClass = () => {
    if (occupancyPercentage >= 100) return 'full';
    if (occupancyPercentage >= 80) return 'warning';
    return '';
  };

  return (
    <div className="room-card">
      <div className="room-header">
        <span className="room-id">{room.id}</span>
        <h3 className="room-name">{room.name}</h3>
        <span className={`room-type ${room.type}`}>{room.type}</span>
      </div>

      <div className="room-stats">
        <div className="stat-row">
          <Users className="stat-icon" size={18} />
          <span><strong>{room.currentCount}</strong> / {room.capacity} occupants</span>
        </div>
        <div className="stat-row">
          <MapPin className="stat-icon" size={18} />
          <span>Block {room.block}</span>
        </div>
      </div>

      <div className="capacity-bar">
        <div className="capacity-label">
          <span>Capacity</span>
          <span>{Math.round(occupancyPercentage)}%</span>
        </div>
        <div className="capacity-progress">
          <div
            className={`capacity-fill ${getCapacityClass()}`}
            style={{ width: `${Math.min(occupancyPercentage, 100)}%` }}
          />
        </div>
      </div>

      {isOverCapacity && (
        <div className="overcapacity-badge">
          <AlertCircle size={14} />
          <span>Over Capacity</span>
        </div>
      )}

      <div className="room-features">
        <div className={`feature-badge ${room.internetAvailable ? 'active' : ''}`}>
          <Wifi size={16} />
          <span>WiFi</span>
        </div>
        <div className={`feature-badge ${room.smartBoard ? 'active' : ''}`}>
          <Monitor size={16} />
          <span>Smart Board</span>
        </div>
      </div>

      <div className="teacher-actions">
        <button className="btn btn-small btn-primary" onClick={(e) => { e.stopPropagation(); onReserve(); }}>
          Reserve
        </button>
        <button className="btn btn-small btn-secondary" onClick={(e) => { e.stopPropagation(); onClick(); }}>
          View Details
        </button>
        {isOverCapacity && (
          <button className="btn btn-small btn-warning" onClick={(e) => { e.stopPropagation(); onSuggest(); }}>
            Suggest Alt
          </button>
        )}
      </div>
    </div>
  );
}

// Reserve Modal Component
function ReserveModal({ room, onClose, onSubmit, result }) {
  const [formData, setFormData] = useState({
    roomId: room.id,
    course: '',
    section: '',
    startTime: ''
  });

  const handleSubmit = () => {
    onSubmit(formData);
  };

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <button className="modal-close" onClick={onClose}>
            <X size={20} color="white" />
          </button>
          <h2>Reserve Room: {room.name}</h2>
          <p>{room.id}</p>
        </div>

        <div className="modal-body">
          {!result ? (
            <div className="reserve-form">
              <div className="form-group">
                <label htmlFor="course" className="form-label">Course Code</label>
                <input
                  id="course"
                  name="course"
                  type="text"
                  className="form-input"
                  placeholder="e.g., CS101"
                  value={formData.course}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="section" className="form-label">Section</label>
                <input
                  id="section"
                  name="section"
                  type="text"
                  className="form-input"
                  placeholder="e.g., A"
                  value={formData.section}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="startTime" className="form-label">Start Time</label>
                <input
                  id="startTime"
                  name="startTime"
                  type="datetime-local"
                  className="form-input"
                  value={formData.startTime}
                  onChange={handleChange}
                />
              </div>

              <div className="action-buttons">
                <button onClick={handleSubmit} className="btn btn-primary">
                  Reserve Room
                </button>
                <button onClick={onClose} className="btn btn-secondary">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="reservation-result">
              <div className="success-message">
                <h3>✅ Reservation Successful</h3>
                <p>Room has been reserved for {result.reservation.course} - Section {result.reservation.section}</p>
              </div>

              {result.nonEnrolled && result.nonEnrolled.length > 0 && (
                <div className="alert">
                  <AlertCircle className="alert-icon" size={24} />
                  <div className="alert-content">
                    <h4>Non-Enrolled Students Detected</h4>
                    <p>{result.nonEnrolled.length} student(s) in this room are not enrolled in {result.reservation.course}</p>
                    <ul className="non-enrolled-list">
                      {result.nonEnrolled.map(student => (
                        <li key={student.id}>{student.name} ({student.email})</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {result.suggestion && (
                <div className="suggestion-box">
                  <h4>📍 Suggested Alternate Room</h4>
                  <p><strong>{result.suggestion.name}</strong> ({result.suggestion.id})</p>
                  <p>Available: {result.suggestion.available} seats</p>
                  <p>Distance: {result.suggestion.distance.toFixed(2)} units</p>
                </div>
              )}

              <div className="action-buttons">
                <button className="btn btn-primary" onClick={onClose}>
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Search Bar Component
function SearchBar({ searchTerm, setSearchTerm }) {
  return (
    <div className="search-container">
      <div className="search-wrapper">
        <Search className="search-icon" size={20} />
        <input
          type="text"
          className="search-input"
          placeholder="Search by room name or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
    </div>
  );
}

// Filter Tabs Component
function FilterTabs({ filterType, setFilterType }) {
  return (
    <div className="filter-tabs">
      <button
        className={`filter-tab ${filterType === 'all' ? 'active' : ''}`}
        onClick={() => setFilterType('all')}
      >
        All Rooms
      </button>
      <button
        className={`filter-tab ${filterType === 'theory' ? 'active' : ''}`}
        onClick={() => setFilterType('theory')}
      >
        Theory Rooms
      </button>
      <button
        className={`filter-tab ${filterType === 'lab' ? 'active' : ''}`}
        onClick={() => setFilterType('lab')}
      >
        Labs
      </button>
    </div>
  );
}

// Room Card Component (for students)
function RoomCard({ room, onClick }) {
  const occupancyPercentage = (room.currentCount / room.capacity) * 100;
  const getCapacityClass = () => {
    if (occupancyPercentage >= 100) return 'full';
    if (occupancyPercentage >= 80) return 'warning';
    return '';
  };

  return (
    <div className="room-card" onClick={onClick}>
      <div className="room-header">
        <span className="room-id">{room.id}</span>
        <h3 className="room-name">{room.name}</h3>
        <span className={`room-type ${room.type}`}>{room.type}</span>
      </div>

      <div className="room-stats">
        <div className="stat-row">
          <Users className="stat-icon" size={18} />
          <span><strong>{room.currentCount}</strong> / {room.capacity} occupants</span>
        </div>
        <div className="stat-row">
          <MapPin className="stat-icon" size={18} />
          <span>Block {room.block}</span>
        </div>
      </div>

      <div className="capacity-bar">
        <div className="capacity-label">
          <span>Capacity</span>
          <span>{Math.round(occupancyPercentage)}%</span>
        </div>
        <div className="capacity-progress">
          <div
            className={`capacity-fill ${getCapacityClass()}`}
            style={{ width: `${Math.min(occupancyPercentage, 100)}%` }}
          />
        </div>
      </div>

      <div className="room-features">
        <div className={`feature-badge ${room.internetAvailable ? 'active' : ''}`}>
          <Wifi size={16} />
          <span>WiFi</span>
        </div>
        <div className={`feature-badge ${room.smartBoard ? 'active' : ''}`}>
          <Monitor size={16} />
          <span>Smart Board</span>
        </div>
      </div>
    </div>
  );
}

// Room Detail Modal Component
function RoomDetailModal({ room, onClose, onEntry, showEntryButtons }) {
  const occupancyPercentage = (room.currentCount / room.capacity) * 100;
  const isOverCapacity = room.currentCount > room.capacity;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <button className="modal-close" onClick={onClose}>
            <X size={20} color="white" />
          </button>
          <span className="room-id">{room.id}</span>
          <h2>{room.name}</h2>
          <p>Block {room.block}</p>
        </div>

        <div className="modal-body">
          {isOverCapacity && (
            <div className="alert">
              <AlertCircle className="alert-icon" size={24} />
              <div className="alert-content">
                <h4>Capacity Exceeded</h4>
                <p>This room is currently over its maximum capacity. Consider relocating to an alternate room.</p>
              </div>
            </div>
          )}

          <div className="detail-section">
            <h3>Occupancy Status</h3>
            <div className="capacity-bar">
              <div className="capacity-label">
                <span><strong>{room.currentCount}</strong> / {room.capacity} people</span>
                <span>{Math.round(occupancyPercentage)}%</span>
              </div>
              <div className="capacity-progress">
                <div
                  className={`capacity-fill ${occupancyPercentage >= 100 ? 'full' : occupancyPercentage >= 80 ? 'warning' : ''}`}
                  style={{ width: `${Math.min(occupancyPercentage, 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="detail-section">
            <h3>Room Details</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <Users className="stat-icon" size={20} />
                <div className="detail-item-content">
                  <div className="detail-label">Capacity</div>
                  <div className="detail-value">{room.capacity} people</div>
                </div>
              </div>
              <div className="detail-item">
                <Wifi className="stat-icon" size={20} />
                <div className="detail-item-content">
                  <div className="detail-label">Internet</div>
                  <div className="detail-value">{room.internetAvailable ? 'Available' : 'Not Available'}</div>
                </div>
              </div>
              <div className="detail-item">
                <Monitor className="stat-icon" size={20} />
                <div className="detail-item-content">
                  <div className="detail-label">Smart Board</div>
                  <div className="detail-value">{room.smartBoard ? 'Yes' : 'No'}</div>
                </div>
              </div>
              <div className="detail-item">
                <MapPin className="stat-icon" size={20} />
                <div className="detail-item-content">
                  <div className="detail-label">Location (x, y)</div>
                  <div className="detail-value">{room.location ? `${room.location.x}, ${room.location.y}` : 'N/A'}</div>
                </div>
              </div>
            </div>
          </div>

          {room.schedule && room.schedule.length > 0 && (
            <div className="detail-section">
              <h3>Schedule</h3>
              <div className="detail-grid">
                {room.schedule.map((s, idx) => (
                  <div className="detail-item" key={idx}>
                    <div className="detail-item-content">
                      <div className="detail-label">{s.course}</div>
                      <div className="detail-value">{s.start} - {s.end}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showEntryButtons && (
            <div className="action-buttons">
              <button className="btn btn-primary" onClick={() => onEntry(room.id, 'enter')}>
                Mark Entry
              </button>
              <button className="btn btn-secondary" onClick={() => onEntry(room.id, 'exit')}>
                Mark Exit
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Loading State Component
function LoadingState() {
  return (
    <div className="loading-container">
      <div className="loading-spinner" />
      <h2>Loading...</h2>
    </div>
  );
}

// Error State Component
function ErrorState({ error, onRetry }) {
  return (
    <div className="error-container">
      <h2>⚠️ Error Loading Data</h2>
      <p>{error}</p>
      <button className="retry-btn" onClick={onRetry}>Retry</button>
    </div>
  );
}

export default App;