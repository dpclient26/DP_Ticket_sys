// ==========================================
// Authentication Guard
// ==========================================
const loggedInUser = sessionStorage.getItem('ops_portal_user');

if (!loggedInUser) {
    // If no user is logged in, redirect to login page
    window.location.href = '/login';
}

// ==========================================
// Logout Function
// ==========================================
function logout() {
    sessionStorage.removeItem('ops_portal_user');
    localStorage.removeItem('ops_portal_token'); // Clear "remember me" if used
    window.location.href = '/login';
}

// ==========================================
// Inactivity Auto-Logout (2 Minutes)
// ==========================================
const INACTIVITY_LIMIT = 2 * 60 * 1000; // 2 minutes in milliseconds
let inactivityTimer;

function logoutDueToInactivity() {
    sessionStorage.removeItem('ops_portal_user');
    localStorage.removeItem('ops_portal_token');
    // Redirect with a special flag so login page can show a message
    window.location.href = '/login?timeout=true';
}

function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(logoutDueToInactivity, INACTIVITY_LIMIT);
}

// Only track inactivity if the user is actually logged in
if (loggedInUser) {
    // List of events that count as "activity"
    const activityEvents = [
        'mousemove',   // Moving the mouse
        'mousedown',   // Clicking
        'keydown',     // Typing
        'scroll',      // Scrolling
        'touchstart',  // Touching (mobile)
        'click'        // General clicks
    ];

    // Attach the reset function to all events
    activityEvents.forEach(event => {
        window.addEventListener(event, resetInactivityTimer, { passive: true });
    });

    // Start the timer when the page loads
    resetInactivityTimer();
}