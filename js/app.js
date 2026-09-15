// ==========================================
// 1. Google Sheets Integration Setup
// ==========================================
const scriptURL = 'https://script.google.com/macros/s/AKfycbz6xRJNKuTGjBKhDrifjTyf3AXaiTMcYxSBMe1BzdruNvW-0a8lNNVRtjvR0M9KJFew/exec'; // google code

// Global State
let allRecords = [];
let filteredRecords = [];
let currentPage = 1;
const recordsPerPage = 5;
let currentFilter = 'all';
let searchQuery = '';

document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('tableBody');
    if (tableBody) {
        fetchAndRenderRecords();
        setupFilters();
        setupSearch();
        setupDownloadButton();
    }

    const form = document.getElementById('requestForm');
    if (form) setupFormLogic(form);
});

// Helper: Format any date string to YYYY-MM-DD for HTML date inputs
function formatDateForInput(dateStr) {
    if (!dateStr) return '';
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr.split('T')[0];
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// ==========================================
// 2. Fetch Data & Update Dashboard Stats
// ==========================================
function fetchAndRenderRecords() {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = `<tr><td colspan="8" class="text-center py-4"><div class="spinner-border text-primary" role="status"></div><br>Loading records...</td></tr>`;

    fetch(scriptURL + "?action=get")
        .then(response => response.json())
        .then(data => {
            allRecords = data.reverse(); 
            updateStats();
            applyFiltersAndRender();
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            tableBody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-danger">Error loading records. Check console.</td></tr>`;
        });
}

function updateStats() {
    const total = allRecords.length;
    const completed = allRecords.filter(r => r['Status'] === 'Completed').length;
    const active = allRecords.filter(r => r['Status'] === 'Pending' || r['Status'] === 'In Progress').length;

    document.getElementById('totalCount').innerText = total;
    document.getElementById('completedCount').innerText = completed;
    document.getElementById('activeCount').innerText = active;
}

// ==========================================
// 3. Filtering, Searching, and Table Rendering
// ==========================================
function applyFiltersAndRender() {
    if (currentFilter === 'all') {
        filteredRecords = [...allRecords];
    } else {
        filteredRecords = allRecords.filter(r => r['Status'] === currentFilter);
    }

    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredRecords = filteredRecords.filter(r => {
            const rowString = Object.values(r).join(' ').toLowerCase();
            return rowString.includes(query);
        });
    }

    if (currentPage > Math.ceil(filteredRecords.length / recordsPerPage)) {
        currentPage = 1;
    }

    renderTable();
    renderPagination();
}

function renderTable() {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '';

    if (filteredRecords.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No records found matching your criteria.</td></tr>`;
        return;
    }

    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    const paginatedData = filteredRecords.slice(startIndex, endIndex);

    paginatedData.forEach((row, index) => {
        let reqDate = row['Request Date'] || 'N/A';
        if (reqDate && reqDate.includes('-')) {
            const dateObj = new Date(reqDate);
            reqDate = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        }

        const actionBy = row['Action Taken By'] || 'Unknown';
        const initials = actionBy.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        const problem = row['Problem Statement / Objective'] || 'N/A';
        const shortProblem = problem.length > 30 ? problem.substring(0, 30) + '...' : problem;
        
        const rawId = row['Reference Number/Ticket Number'] || '';
        const displayId = rawId ? rawId : 'N/A';

        const editAction = rawId 
            ? `<a href="form.html?edit=${encodeURIComponent(rawId)}" class="text-primary fw-semibold text-decoration-none me-3 action-btn">View/Edit</a>` 
            : `<a href="#" class="text-muted fw-semibold text-decoration-none me-3" onclick="alert('Cannot edit: Missing Reference Number.'); return false;">Edit</a>`;
        
        const deleteAction = rawId 
            ? `<a href="#" class="text-danger fw-semibold text-decoration-none action-btn delete-btn" data-id="${rawId}">Delete</a>` 
            : `<a href="#" class="text-muted fw-semibold text-decoration-none" onclick="alert('Cannot delete: Missing Reference Number.'); return false;">Delete</a>`;

        const tr = document.createElement('tr');
        tr.className = 'animate-row';
        tr.style.animationDelay = `${index * 0.1}s`;

        tr.innerHTML = `
            <td class="px-4 ${rawId ? 'text-primary' : 'text-muted'} fw-semibold">${displayId}</td>
            <td class="fw-semibold">${row['Requested Department'] || 'N/A'}</td>
            <td>${reqDate}</td>
            <td class="text-muted">${row['Letter / Email Reference'] || '-'}</td>
            <td><span class="badge bg-light text-dark border me-2">${initials}</span> ${actionBy}</td>
            <td class="text-truncate" style="max-width: 200px;" title="${problem}">${shortProblem}</td>
            <td class="text-muted">${row['Datasets Used'] || '-'}</td>
            <td class="text-end px-4">${editAction}${deleteAction}</td>
        `;
        tableBody.appendChild(tr);
    });
}

// ==========================================
// 4. UI Controls (Filters, Search, Pagination)
// ==========================================
function setupFilters() {
    const filterGroup = document.getElementById('filterGroup');
    if (!filterGroup) return;

    filterGroup.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            filterGroup.querySelectorAll('button').forEach(btn => {
                btn.classList.remove('btn-white', 'active', 'fw-semibold');
                btn.classList.add('btn-light', 'text-muted');
            });
            e.target.classList.remove('btn-light', 'text-muted');
            e.target.classList.add('btn-white', 'active', 'fw-semibold');

            currentFilter = e.target.getAttribute('data-filter');
            currentPage = 1;
            applyFiltersAndRender();
        }
    });
}

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        currentPage = 1;
        applyFiltersAndRender();
    });
}

function renderPagination() {
    const paginationText = document.getElementById('paginationText');
    const paginationControls = document.getElementById('paginationControls');
    
    const totalFiltered = filteredRecords.length;
    const totalPages = Math.ceil(totalFiltered / recordsPerPage) || 1;
    
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = Math.min(startIndex + recordsPerPage, totalFiltered);

    if (totalFiltered === 0) {
        paginationText.innerText = "Showing 0 to 0 of 0 requests";
        paginationControls.innerHTML = '';
        return;
    }

    paginationText.innerText = `Showing ${startIndex + 1} to ${endIndex} of ${totalFiltered} requests`;

    let html = '';
    html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}"><a class="page-link" href="#" data-page="${currentPage - 1}">Previous</a></li>`;

    for (let i = 1; i <= totalPages; i++) {
        html += `<li class="page-item ${currentPage === i ? 'active' : ''}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
    }

    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}"><a class="page-link" href="#" data-page="${currentPage + 1}">Next</a></li>`;

    paginationControls.innerHTML = html;

    paginationControls.querySelectorAll('.page-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = parseInt(e.target.getAttribute('data-page'));
            if (page >= 1 && page <= totalPages && page !== currentPage) {
                currentPage = page;
                applyFiltersAndRender();
            }
        });
    });
}

// ==========================================
// 5. Form Logic (Handles both Add and Edit)
// ==========================================
function setupFormLogic(form) {
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');
    const submitBtn = document.getElementById('submitBtn');
    const refNumberInput = document.getElementById('refNumberInput');

    if (editId && editId !== 'undefined' && editId !== 'N/A') {
        // --- EDIT MODE ---
        document.getElementById('formTitle').innerText = 'Edit Data Request';
        document.getElementById('formSubtitle').innerText = 'Update the fields below to modify the request in the registry.';
        submitBtn.innerHTML = '<i class="bi bi-save me-2"></i> Update Request';
        
        // Display the existing ID in the readonly field
        refNumberInput.value = editId;

        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.name = 'originalId';
        hiddenInput.value = editId;
        form.appendChild(hiddenInput);

        fetch(scriptURL + "?action=get")
            .then(res => res.json())
            .then(data => {
                const record = data.find(r => r['Reference Number/Ticket Number'] == editId);
                
                if (record) {
                    const fieldsToFill = [
                        'Requested Department', 'Request Date', 'Letter / Email Reference',
                        'Action Taken By', 'Problem Statement / Objective', 'Datasets Used',
                        'Date for Data Dump', 'Received Count', 'Completed Date',
                        'Result Shared Mode', 'Analysis Outcome', 'File Path (if any)',
                        'Action Taken', 'Status'
                    ];

                    fieldsToFill.forEach(field => {
                        const input = form.elements[field];
                        if (input && record[field] !== undefined && record[field] !== null) {
                            if (input.type === 'date') {
                                input.value = formatDateForInput(record[field]);
                            } else {
                                input.value = record[field];
                            }
                        }
                    });
                } else {
                    alert("Record not found in database!");
                    window.location.href = 'index.html';
                }
            })
            .catch(err => {
                console.error("Error fetching record for edit:", err);
                alert("Failed to load record details.");
            });
    } else {
        // --- ADD MODE ---
        // Explicitly set the placeholder text so the user knows it will be auto-filled
        refNumberInput.value = "";
        refNumberInput.placeholder = "Auto-generated on save";
    }

    form.addEventListener('submit', e => {
        e.preventDefault();
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Saving...';
        submitBtn.disabled = true;

        const formData = new FormData(form);
        const urlEncodedData = new URLSearchParams(formData);
        const actionType = urlEncodedData.has('originalId') ? 'update' : 'add';
        urlEncodedData.append('action', actionType);

        fetch(scriptURL, { method: 'POST', body: urlEncodedData })
        .then(response => response.json())
        .then(result => {
            if (result.result === 'success') {
                // If it was a new add, show the generated ID in the alert
                const msg = actionType === 'add' 
                    ? `Request submitted successfully! Generated ID: ${result.id}` 
                    : `Request updated successfully!`;
                alert(msg);
                window.location.href = 'index.html'; 
            } else {
                alert('Error: ' + result.error);
            }
        })
        .catch(error => alert('Network error. Check console.'))
        .finally(() => {
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
        });
    });

    document.getElementById('clearBtn')?.addEventListener('click', () => {
        form.reset();
        // Preserve the edit ID if we are in edit mode
        if (editId && editId !== 'undefined' && editId !== 'N/A') {
            refNumberInput.value = editId;
        }
    });
}

// ==========================================
// 6. Delete Functionality
// ==========================================
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('delete-btn')) {
        e.preventDefault();
        const btn = e.target;
        const refNum = btn.getAttribute('data-id');
        
        if (confirm(`Are you sure you want to delete record ${refNum}?`)) {
            const deleteData = new URLSearchParams();
            deleteData.append('action', 'delete');
            deleteData.append('Reference Number/Ticket Number', refNum);

            const originalText = btn.innerHTML;
            btn.innerHTML = 'Deleting...';
            btn.style.pointerEvents = 'none';

            fetch(scriptURL, { method: 'POST', body: deleteData })
            .then(response => response.json())
            .then(result => {
                if (result.result === 'success') {
                    allRecords = allRecords.filter(r => r['Reference Number/Ticket Number'] !== refNum);
                    updateStats();
                    applyFiltersAndRender();
                } else {
                    alert('Error deleting record: ' + result.error);
                    btn.innerHTML = originalText;
                    btn.style.pointerEvents = 'auto';
                }
            })
            .catch(error => {
                alert('Error connecting to Google Sheets.');
                btn.innerHTML = originalText;
                btn.style.pointerEvents = 'auto';
            });
        }
    }
});

// ==========================================
// 7. Download Sheet (CSV) Functionality
// ==========================================

// Helper function to format dates for CSV export
function formatValueForCSV(key, value) {
    if (value === null || value === undefined) return '';
    let strValue = String(value);

    // Check if it's an ISO date string (e.g., 2026-09-15T11:43:47.000Z)
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(strValue)) {
        const d = new Date(strValue);
        if (isNaN(d.getTime())) return strValue; // Return raw if invalid

        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();

        // If it's the Timestamp column, include the time
        if (key === 'Timestamp') {
            let hours = d.getHours();
            const minutes = String(d.getMinutes()).padStart(2, '0');
            const seconds = String(d.getSeconds()).padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12; // the hour '0' should be '12'
            return `${day}-${month}-${year} ${String(hours).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
        }
        
        // For normal Date fields (Request Date, Completed Date, etc.), just return DD-MM-YYYY
        return `${day}-${month}-${year}`;
    }
    
    // Handle plain YYYY-MM-DD strings
    if (/^\d{4}-\d{2}-\d{2}$/.test(strValue)) {
        const parts = strValue.split('-');
        return `${parts[2]}-${parts[1]}-${parts[0]}`; // Convert to DD-MM-YYYY
    }

    return strValue;
}

function setupDownloadButton() {
    const downloadBtn = document.getElementById('downloadBtn');
    if (!downloadBtn) return;

    downloadBtn.addEventListener('click', () => {
        if (allRecords.length === 0) {
            alert("No data available to download.");
            return;
        }

        const headers = Object.keys(allRecords[0]);
        const csvRows = [];
        
        // Add headers row
        csvRows.push(headers.map(header => `"${header}"`).join(','));

        // Add data rows
        allRecords.forEach(record => {
            const values = headers.map(header => {
                let val = record[header] || '';
                
                // Format dates before adding to CSV
                val = formatValueForCSV(header, val);

                // Escape double quotes inside the value
                val = String(val).replace(/"/g, '""');
                // Wrap in double quotes to handle commas inside text
                return `"${val}"`;
            });
            csvRows.push(values.join(','));
        });

        // Create CSV Blob
        const csvString = '\uFEFF' + csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        
        // Trigger Download
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        const date = new Date();
        const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        
        link.setAttribute('href', url);
        link.setAttribute('download', `Operations_Data_${dateString}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    });
}
