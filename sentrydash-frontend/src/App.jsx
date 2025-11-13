import React, { useState, useEffect } from 'react';
import { X, Search, Wifi, Monitor, Users, MapPin, AlertCircle } from 'lucide-react';

// API Configuration
const API_BASE_URL = 'http://sentrydash-backend:3000/api';

// Styles
const styles = `
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Header */
.header {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
  padding: 1.2rem 2rem;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  font-size: 1.8rem;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.nav-links {
  display: flex;
  gap: 2rem;
  list-style: none;
}

.nav-link {
  color: #4a5568;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
  cursor: pointer;
}

.nav-link:hover,
.nav-link.active {
  color: #667eea;
}

/* Main Content */
.main-content {
  flex: 1;
  padding: 2rem;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
}

/* Dashboard */
.dashboard-header {
  text-align: center;
  color: white;
  margin-bottom: 2rem;
}

.dashboard-title {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.dashboard-subtitle {
  font-size: 1.1rem;
  opacity: 0.9;
}

/* Search Bar */
.search-container {
  margin-bottom: 2rem;
}

.search-wrapper {
  position: relative;
  max-width: 600px;
  margin: 0 auto;
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #a0aec0;
}

.search-input {
  width: 100%;
  padding: 1rem 1rem 1rem 3rem;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  background: white;
  color: #2d3748;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.2s;
}

.search-input::placeholder {
  color: #a0aec0;
}

.search-input:focus {
  outline: none;
  box-shadow: 0 6px 30px rgba(102, 126, 234, 0.3);
}

/* Filter Tabs */
.filter-tabs {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.filter-tab {
  padding: 0.7rem 1.5rem;
  border: none;
  border-radius: 25px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-tab:hover {
  background: rgba(255, 255, 255, 0.3);
}

.filter-tab.active {
  background: white;
  color: #667eea;
}

/* Room Grid */
.rooms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.room-card {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  transition: all 0.3s;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.room-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
}

.room-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
}

.room-header {
  margin-bottom: 1rem;
}

.room-id {
  display: inline-block;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0.3rem 0.8rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.room-name {
  font-size: 1.3rem;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 0.3rem;
}

.room-type {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
  text-transform: uppercase;
}

.room-type.theory {
  background: #e6fffa;
  color: #047857;
}

.room-type.lab {
  background: #fef3c7;
  color: #92400e;
}

.room-stats {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  margin: 1rem 0;
}

.stat-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #4a5568;
  font-size: 0.95rem;
}

.stat-icon {
  color: #667eea;
}

.capacity-bar {
  margin-top: 1rem;
}

.capacity-label {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: #718096;
  margin-bottom: 0.5rem;
}

.capacity-progress {
  height: 8px;
  background: #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
}

.capacity-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  transition: width 0.3s;
}

.capacity-fill.warning {
  background: linear-gradient(90deg, #f59e0b 0%, #dc2626 100%);
}

.capacity-fill.full {
  background: linear-gradient(90deg, #dc2626 0%, #991b1b 100%);
}

.room-features {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
}

.feature-badge {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.8rem;
  color: #4a5568;
}

.feature-badge.active {
  color: #667eea;
}

/* Room Detail Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 20px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  animation: modalSlideIn 0.3s ease;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem;
  position: relative;
}

.modal-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
}

.modal-close:hover {
  background: rgba(255, 255, 255, 0.3);
}

.modal-body {
  padding: 2rem;
}

.detail-section {
  margin-bottom: 1.5rem;
}

.detail-section h3 {
  font-size: 1.1rem;
  color: #2d3748;
  margin-bottom: 1rem;
  font-weight: 600;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: #f7fafc;
  border-radius: 8px;
}

.detail-item-content {
  flex: 1;
}

.detail-label {
  font-size: 0.85rem;
  color: #718096;
  margin-bottom: 0.2rem;
}

.detail-value {
  font-size: 1rem;
  color: #2d3748;
  font-weight: 600;
}

.action-buttons {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

.btn {
  flex: 1;
  padding: 0.9rem;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 1rem;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: #e2e8f0;
  color: #4a5568;
}

.btn-secondary:hover {
  background: #cbd5e0;
}

/* Loading & Error States */
.loading-container,
.error-container {
  text-align: center;
  padding: 4rem 2rem;
  color: white;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-container h2 {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.retry-btn {
  margin-top: 1rem;
  padding: 0.8rem 2rem;
  background: white;
  color: #667eea;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
}

.retry-btn:hover {
  transform: scale(1.05);
}

/* Alert */
.alert {
  padding: 1rem;
  background: #fef3c7;
  border-left: 4px solid #f59e0b;
  border-radius: 8px;
  display: flex;
  align-items: start;
  gap: 0.8rem;
  margin-bottom: 1.5rem;
}

.alert-icon {
  color: #f59e0b;
  flex-shrink: 0;
}

.alert-content h4 {
  font-size: 1rem;
  color: #92400e;
  margin-bottom: 0.3rem;
}

.alert-content p {
  font-size: 0.9rem;
  color: #78350f;
}

/* Responsive */
@media (max-width: 768px) {
  .header {
    padding: 1rem;
  }
  
  .header-content {
    flex-direction: column;
    gap: 1rem;
  }
  
  .nav-links {
    gap: 1rem;
  }
  
  .dashboard-title {
    font-size: 1.8rem;
  }
  
  .rooms-grid {
    grid-template-columns: 1fr;
  }
  
  .detail-grid {
    grid-template-columns: 1fr;
  }
  
  .action-buttons {
    flex-direction: column;
  }
}
`;

// Main App Component
function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [rooms, setRooms] = useState([]);
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
        body: JSON.stringify({ roomId, action })
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

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        <Header currentView={currentView} setCurrentView={setCurrentView} />
        <main className="main-content">
          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState error={error} onRetry={fetchRooms} />
          ) : (
            <Dashboard
              rooms={filteredRooms}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              filterType={filterType}
              setFilterType={setFilterType}
              onRoomClick={handleRoomClick}
            />
          )}
        </main>
        {selectedRoom && (
          <RoomDetailModal
            room={selectedRoom}
            onClose={() => setSelectedRoom(null)}
            onEntry={handleEntry}
          />
        )}
      </div>
    </>
  );
}

// Header Component
function Header({ currentView, setCurrentView }) {
  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">🏫 SentryDash</div>
        <nav>
          <ul className="nav-links">
            <li>
              <a
                className={`nav-link ${currentView === 'dashboard' ? 'active' : ''}`}
                onClick={() => setCurrentView('dashboard')}
              >
                Dashboard
              </a>
            </li>
            <li>
              <a className="nav-link">Analytics</a>
            </li>
            <li>
              <a className="nav-link">Settings</a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}

// Dashboard Component
function Dashboard({ rooms, searchTerm, setSearchTerm, filterType, setFilterType, onRoomClick }) {
  return (
    <>
      <div className="dashboard-header">
        <h1 className="dashboard-title">Room Occupancy Dashboard</h1>
        <p className="dashboard-subtitle">Monitor and manage classroom capacities in real-time</p>
      </div>

      <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
      
      <FilterTabs filterType={filterType} setFilterType={setFilterType} />

      <div className="rooms-grid">
        {rooms.map(room => (
          <RoomCard key={room.id} room={room} onClick={() => onRoomClick(room.id)} />
        ))}
      </div>

      {rooms.length === 0 && (
        <div style={{ textAlign: 'center', color: 'white', padding: '2rem' }}>
          <p style={{ fontSize: '1.2rem' }}>No rooms found matching your criteria</p>
        </div>
      )}
    </>
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

// Room Card Component
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
          <span>Block {room.block} • {room.distance}m away</span>
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
function RoomDetailModal({ room, onClose, onEntry }) {
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
          <h2 style={{ fontSize: '1.8rem', marginTop: '0.5rem' }}>{room.name}</h2>
          <p style={{ opacity: 0.9, marginTop: '0.3rem' }}>Block {room.block}</p>
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
                <MapPin className="stat-icon" size={20} />
                <div className="detail-item-content">
                  <div className="detail-label">Distance</div>
                  <div className="detail-value">{room.distance}m</div>
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
            </div>
          </div>

          <div className="action-buttons">
            <button className="btn btn-primary" onClick={() => onEntry(room.id, 'enter')}>
              Mark Entry
            </button>
            <button className="btn btn-secondary" onClick={() => onEntry(room.id, 'exit')}>
              Mark Exit
            </button>
          </div>
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
      <h2>Loading Rooms...</h2>
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