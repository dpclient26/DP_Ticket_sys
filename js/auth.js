// Check if the user is logged in
const token = localStorage.getItem('ops_portal_token');

if (!token) {
    // If no token, redirect to login page
    window.location.href = 'login.html';
}

// Logout function
function logout() {
    localStorage.removeItem('ops_portal_token');
    window.location.href = 'login.html';
}