// EmailJS configuration
const EMAILJS_SERVICE_ID = "service_t5ayh4m"; // Replace with your EmailJS service ID
const EMAILJS_TEMPLATE_ID = "template_u6odj0i"; // Replace with your EmailJS template ID

// Simulated pH monitoring
let currentPh = 7.4;
const phRange = { min: 6.5, max: 8.5 };
let userEmail = localStorage.getItem('userEmail') || '';

// Store unsafe pH value
let unsafePhValue = null;

// Check if user is logged in
function checkAuth() {
    const loggedInUser = localStorage.getItem('userEmail');
    if (!loggedInUser && window.location.pathname !== '/login.html') {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Handle login
function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Simple validation (in a real app, this would be server-side)
    if (email && password) {
        localStorage.setItem('userEmail', email);
        window.location.href = 'index.html';
    }
    return false;
}

// Handle logout
function logout() {
    alert('Logout function called!');
    localStorage.removeItem('userEmail');
    window.location.href = 'login.html';
}

// Update user info display
function updateUserInfo() {
    const userEmailElement = document.getElementById('userEmail');
    if (userEmailElement) {
        const currentUserEmail = localStorage.getItem('userEmail');
        userEmailElement.textContent = currentUserEmail ? currentUserEmail : '';
    }
}

// Initialize the dashboard
function initDashboard() {
    if (!checkAuth()) return;
    
    updateUserInfo();
    
    if (document.getElementById('phValue')) {
        updatePhDisplay();
    }
}

// Update pH display and status
function updatePhDisplay() {
    const phValue = document.getElementById('phValue');
    const tankStatus = document.getElementById('tankStatus');
    const scheduleButton = document.querySelector('.action-card .btn');
    
    if (phValue && tankStatus) {
        phValue.textContent = currentPh.toFixed(1);
        
        if (currentPh >= phRange.min && currentPh <= phRange.max) {
            tankStatus.textContent = 'Safe ✅';
            tankStatus.style.color = 'var(--success-color)';
            tankStatus.style.backgroundColor = 'rgba(52, 168, 83, 0.1)';
            if (scheduleButton) {
                scheduleButton.style.display = 'none';
            }
            unsafePhValue = null;
        } else {
            tankStatus.textContent = 'Unsafe ⚠️';
            tankStatus.style.color = 'var(--warning-color)';
            tankStatus.style.backgroundColor = 'rgba(251, 188, 4, 0.1)';
            if (scheduleButton) {
                scheduleButton.style.display = 'inline-block';
            }
            unsafePhValue = currentPh;
            localStorage.setItem('unsafePhValue', unsafePhValue);
        }
    }
}

// Send email notification
async function sendEmailNotification(subject, message) {
    try {
        if (!userEmail) {
            console.error('No user email found for sending notification.');
            return;
        }
        console.log('Sending email to:', userEmail);
        const templateParams = {
            to_email: userEmail,
            subject: subject,
            message: message
        };

        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams, "iE7UxuhqqnWl9zl1l");
        console.log('Email sent successfully');
    } catch (error) {
        console.error('Failed to send email:', error);
    }
}

// Update pH manually
function updateManualPh() {
    const phInput = document.getElementById('phInput');
    if (phInput) {
        const newPh = parseFloat(phInput.value);
        if (!isNaN(newPh) && newPh >= 0 && newPh <= 14) {
            currentPh = newPh;
            updatePhDisplay();
            
            // Add pH check to alerts
            const alerts = JSON.parse(localStorage.getItem('alerts') || '[]');
            const status = newPh >= phRange.min && newPh <= phRange.max ? 'Safe' : 'Unsafe';
            const alertMessage = `pH Check: ${newPh.toFixed(1)} (${status})`;
            alerts.unshift({
                type: 'ph-check',
                message: alertMessage,
                timestamp: new Date().toLocaleString()
            });
            localStorage.setItem('alerts', JSON.stringify(alerts));

            // Send email if pH is unsafe
            if (newPh < phRange.min || newPh > phRange.max) {
                sendEmailNotification(
                    '⚠️ Unsafe pH Level Detected',
                    `The water tank pH level (${newPh.toFixed(1)}) is outside the safe range (${phRange.min}-${phRange.max}). Please check the system and schedule cleaning if necessary.`
                );
            }
        } else {
            alert('Please enter a valid pH value between 0 and 14');
        }
    }
}

// Schedule cleaning
function scheduleCleaning() {
    if (!checkAuth()) return;
    
    const dateInput = document.getElementById('cleaningDate');
    const scheduleDisplay = document.getElementById('scheduleDisplay');
    
    if (dateInput && scheduleDisplay) {
        const selectedDate = new Date(dateInput.value);
        
        if (isNaN(selectedDate.getTime())) {
            alert('Please select a valid date and time');
            return;
        }

        // Get the unsafe pH value
        const unsafePh = parseFloat(localStorage.getItem('unsafePhValue'));
        
        // Check if pH is in safe range
        if (unsafePh >= phRange.min && unsafePh <= phRange.max) {
            alert('Cannot schedule cleaning while pH is safe. Schedule is only available when pH is unsafe.');
            return;
        }
        
        const formattedDate = selectedDate.toLocaleString();
        localStorage.setItem('scheduledCleaning', JSON.stringify({
            date: formattedDate,
            ph: unsafePh
        }));
        
        scheduleDisplay.innerHTML = `
            <div class="alert-item">
                <span>🕒 Next cleaning scheduled for:</span>
                <strong>${formattedDate}</strong>
                <span>(Triggered by unsafe pH: ${unsafePh.toFixed(1)})</span>
            </div>
        `;

        // Add to alerts
        const alerts = JSON.parse(localStorage.getItem('alerts') || '[]');
        const alertMessage = `Cleaning Scheduled (pH: ${unsafePh.toFixed(1)})`;
        alerts.unshift({
            type: 'schedule',
            message: alertMessage,
            timestamp: formattedDate
        });
        localStorage.setItem('alerts', JSON.stringify(alerts));

        // Send email notification for scheduled cleaning
        sendEmailNotification(
            '🕒 Water Tank Cleaning Scheduled',
            `A cleaning has been scheduled for ${formattedDate} due to unsafe pH level (${unsafePh.toFixed(1)}).`
        );
    }
}

// Load scheduled cleaning
function loadScheduledCleaning() {
    if (!checkAuth()) return;
    
    const scheduleDisplay = document.getElementById('scheduleDisplay');
    if (scheduleDisplay) {
        const scheduledData = localStorage.getItem('scheduledCleaning');
        if (scheduledData) {
            const { date, ph } = JSON.parse(scheduledData);
            scheduleDisplay.innerHTML = `
                <div class="alert-item">
                    <span>🕒 Next cleaning scheduled for:</span>
                    <strong>${date}</strong>
                    <span>(Triggered by unsafe pH: ${ph.toFixed(1)})</span>
                </div>
            `;
        }
    }
}

// Display alerts
function displayAlerts() {
    if (!checkAuth()) return;
    
    const alertsList = document.getElementById('alertsList');
    if (alertsList) {
        // Get stored alerts
        const storedAlerts = JSON.parse(localStorage.getItem('alerts') || '[]');
        
        if (storedAlerts.length === 0) {
            alertsList.innerHTML = `
                <div class="alert-item">
                    <span>No alerts or schedules found</span>
                </div>
            `;
            return;
        }
        
        alertsList.innerHTML = storedAlerts.map(alert => {
            const icon = alert.type === 'schedule' ? '🕒' : 
                        alert.type === 'ph-check' ? '📊' : '⚠️';
            return `
                <div class="alert-item ${alert.type}">
                    <span>${icon} ${alert.message}</span>
                    <span>– ${alert.timestamp}</span>
                </div>
            `;
        }).join('');
    }
}

// Display scheduled cleaning on schedule page
function updateScheduleDisplay() {
  const scheduleDisplay = document.getElementById('scheduleDisplay');
  if (scheduleDisplay) {
    const schedule = JSON.parse(localStorage.getItem('scheduledCleaning') || 'null');
    if (schedule && schedule.date) {
      scheduleDisplay.innerHTML = `Next cleaning scheduled for: <strong>${schedule.date}</strong> (pH: ${schedule.ph})`;
    } else {
      scheduleDisplay.textContent = 'No cleaning scheduled';
    }
  }
}

// Display alerts on alerts page
function updateAlertsDisplay() {
  const alertsList = document.getElementById('alertsList');
  if (alertsList) {
    const alerts = JSON.parse(localStorage.getItem('alerts') || '[]');
    if (alerts.length === 0) {
      alertsList.innerHTML = '<p>No alerts yet.</p>';
      return;
    }
    alertsList.innerHTML = alerts.map(alert => `
      <div class="alert-item ${alert.type}">
        <span>${alert.message}</span>
        <span style="margin-left:auto; font-size:0.9em; color:#888;">${alert.timestamp}</span>
      </div>
    `).join('');
  }
}

// Initialize page-specific functionality
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('userEmail').textContent = userEmail || 'Guest';
    
    if (window.location.pathname === '/login.html') {
        // If already logged in, redirect to dashboard
        if (localStorage.getItem('userEmail')) {
            window.location.href = 'index.html';
        }
    } else {
        // Load unsafe pH value if it exists
        unsafePhValue = parseFloat(localStorage.getItem('unsafePhValue'));
        if (unsafePhValue) {
            currentPh = unsafePhValue;
        }
        initDashboard();
        loadScheduledCleaning();
        displayAlerts();
    }
});