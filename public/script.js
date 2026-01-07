// Configuration
let SUPABASE_URL = "";
let SUPABASE_ANON_KEY = "";


document.addEventListener("DOMContentLoaded", async () => {
    try {
        const config = await loadConfig()
        SUPABASE_URL = config.SUPABASE_URL;
        SUPABASE_ANON_KEY = config.SUPABASE_ANON_KEY;
        await loadSalons();
        setupEventListeners();
    } catch (error) {
        console.error("Failed to initialize app:", error);
        const grid = document.getElementById("grid");
        if (grid) {
            grid.innerHTML = `<p style="color: red;">Error initializing app: ${error.message}</p>`;
        }
    }
});

async function loadConfig() {
    const response = await fetch("/config");
    if (!response.ok) throw new Error("Failed to fetch config");
    return response.json();
}

//Popup Utility Function
function showPopup(message) {
    const popupContainer = document.getElementById("popupContainer");
    const popupMessage = document.getElementById("popupMessage");
    
    if (popupContainer && popupMessage) {
        popupMessage.textContent = message;
        popupContainer.classList.add("active");
    }
}

//Modal Functions 
function openSalonFormModal() {
    const modal = document.getElementById("salonFormModal");
    if (modal) {
        modal.classList.add("active");
        document.getElementById("salonForm").reset();
    }
}

function closeSalonFormModal() {
    const modal = document.getElementById("salonFormModal");
    if (modal) {
        modal.classList.remove("active");
        document.getElementById("salonForm").reset();
    }
}

// Close modal when clicking outside
window.addEventListener("click", (e) => {
    const salonFormModal = document.getElementById("salonFormModal");
    if (e.target === salonFormModal) {
        closeSalonFormModal();
    }
});

//Setup Event Listeners
function setupEventListeners() {
    // Auth button listeners
    const loginBtn = document.getElementById("loginBtn");
    const signupBtn = document.getElementById("signupBtn");
    const logoutBtn = document.getElementById("logoutBtn");
    const cancelLogin = document.getElementById("cancelLogin");
    const cancelSignup = document.getElementById("cancelSignup");
    const loginForm = document.getElementById("loginForm");
    const signupForm = document.getElementById("signupForm");
    
    if (loginBtn) {
        loginBtn.addEventListener("click", openLoginModal);
    }
    
    if (signupBtn) {
        signupBtn.addEventListener("click", openSignupModal);
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener("click", handleLogout);
    }
    
    if (cancelLogin) {
        cancelLogin.addEventListener("click", closeLoginModal);
    }
    
    if (cancelSignup) {
        cancelSignup.addEventListener("click", closeSignupModal);
    }
    
    if (loginForm) {
        loginForm.addEventListener("submit", handleLogin);
    }
    
    if (signupForm) {
        signupForm.addEventListener("submit", handleSignup);
    }
    
    // Salon listeners
    const showAddFormBtn = document.getElementById("showAddFormBtn");
    const cancelSalonForm = document.getElementById("cancelSalonForm");
    const salonForm = document.getElementById("salonForm");

    
    if (showAddFormBtn) {
        showAddFormBtn.addEventListener("click", openSalonFormModal);
    }
    
    if (cancelSalonForm) {
        cancelSalonForm.addEventListener("click", closeSalonFormModal);
    }
    
    if (salonForm) {
        salonForm.addEventListener("submit", AddSalon);
    }


    
    // Popup OK button - using event delegation
    document.addEventListener("click", function(e) {
        if (e.target && (e.target.id === "popupOk" || e.target.classList.contains("popupOk"))) {
            closePopup();
        }
    });
}    

// Close popup function
function closePopup() {
    const popupContainer = document.getElementById("popupContainer");
    if (popupContainer) {
        popupContainer.classList.remove("active");
    }
}

// Load salons function
async function loadSalons() {
    const grid = document.getElementById("grid");
    grid.textContent = "Loading...";

    try {
        const response = await fetch("/salon");
        
        if (!response.ok) {
            throw new Error("Failed to fetch salons");
        }

        const salons = await response.json();
        grid.innerHTML = "";

        if (salons.length === 0) {
            grid.textContent = "No salons found.";
            return;
        }

        // Check if user is logged in
        const isLoggedIn = !!localStorage.getItem("authToken");

        salons.forEach((salon) => {
            const card = document.createElement("div");
            card.className = "card";
            
            // Conditionally show/hide edit and delete buttons based on login status
            const actionButtons = isLoggedIn ? `
                    <div class="card-actions">
                        <button class="edit-btn" onclick="editSalon(${salon.id_salon})">Edit</button>
                        <button class="delete-btn" onclick="deleteSalon(${salon.id_salon})">Delete</button>
                    </div>
            ` : '';
            
            card.innerHTML = `
                <div class="card-header">
                    <h3>${salon.name}</h3>
                </div>
                <div class="card-body">
                    <div class="image-container">
                        <img src="${salon.img}" alt="${salon.name} Image" class="salon-image"/>
                    </div>
                    <p><strong>Location:</strong> ${salon.city}</p>
                    <p><strong>Services:</strong> ${Array.isArray(salon.services) ? salon.services.join(', ') : salon.services}</p>
                    <p><strong>Medium range price:</strong> ${salon.m_range_price}</p>
                    <p><strong>Review:</strong> ${salon.review}</p>
                    <p><strong>Working hours:</strong> ${salon.working_h}</p>
                    <p><strong>Status:</strong> ${salon.status}</p>
                    ${actionButtons}
                </div>
            `;
            grid.appendChild(card);
        });
    } catch (error) {
        grid.innerHTML = `<p style="color: red;">Error loading salons: ${error.message}</p>`;
        console.error("Error:", error);
    }
}


//Add Salon Function
async function AddSalon(e) {
    e.preventDefault();
    
    authToken = localStorage.getItem("authToken");
    
    if (!authToken) {
        showPopup("Please login to continue!");
        return;
    }
    
    const salonData = {
        name: document.getElementById("salonName").value,
        services: document.getElementById("salonServices").value,
        city: document.getElementById("salonCity").value,
        m_range_price: document.getElementById("salonPrice").value,
        review: parseFloat(document.getElementById("salonRating").value),
        working_h: document.getElementById("salonHours").value,
        status: document.getElementById("salonStatus").value,
        img: document.getElementById("salonImage").value
    };
    
    try {
        const response = await fetch("/salon", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${authToken}`
            },
            body: JSON.stringify(salonData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showPopup("Salon added successfully!");
            closeSalonFormModal();
            loadSalons();
        } else {
            showPopup(result.error || "Error adding salon");
        }
    } catch (error) {
        showPopup("Error: " + error.message);
        console.error("Error:", error);
    }
}

//Edit Salon
function editSalon(salonId) {
    const modal = document.getElementById("salonFormModal");
    if (modal) {
        modal.classList.add("active");
        document.getElementById("salonForm").reset();
    }
}

//Delete Salon

function deleteSalon(salonId) {
    
}


// AUTHENTICATION FUNCTIONS

// Check if user is logged in on page load
function checkAuthStatus() {
    const token = localStorage.getItem("authToken");
    const loginBtn = document.getElementById("loginBtn");
    const signupBtn = document.getElementById("signupBtn");
    const logoutBtn = document.getElementById("logoutBtn");
    const showAddFormBtn = document.getElementById("showAddFormBtn");
    
    if (token) {
        // User is logged in
        if (loginBtn) loginBtn.style.display = "none";
        if (signupBtn) signupBtn.style.display = "none";
        if (logoutBtn) logoutBtn.style.display = "block";
        if (showAddFormBtn) showAddFormBtn.style.display = "block";
    } else {
        // User is not logged in
        if (loginBtn) loginBtn.style.display = "block";
        if (signupBtn) signupBtn.style.display = "block";
        if (logoutBtn) logoutBtn.style.display = "none";
        if (showAddFormBtn) showAddFormBtn.style.display = "none";
    }
}

// Login Modal Functions
function openLoginModal() {
    const modal = document.getElementById("loginModal");
    if (modal) {
        modal.classList.add("active");
        document.getElementById("loginForm").reset();
    }
}

function closeLoginModal() {
    const modal = document.getElementById("loginModal");
    if (modal) {
        modal.classList.remove("active");
        document.getElementById("loginForm").reset();
    }
}

// Signup Modal Functions
function openSignupModal() {
    const modal = document.getElementById("signupModal");
    if (modal) {
        modal.classList.add("active");
        document.getElementById("signupForm").reset();
    }
}

function closeSignupModal() {
    const modal = document.getElementById("signupModal");
    if (modal) {
        modal.classList.remove("active");
        document.getElementById("signupForm").reset();
    }
}

// Handle Login
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById("loginUsername").value;
    const password = document.getElementById("loginPassword").value;
    
    if (!username || !password) {
        showPopup("Please fill in all fields");
        return;
    }
    
    try {
        const response = await fetch("/users", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, password })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Store token in localStorage
            localStorage.setItem("authToken", result.token);
            showPopup("Login successful!");
            closeLoginModal();
            checkAuthStatus();
            loadSalons();
        } else {
            showPopup(result.error || "Login failed");
        }
    } catch (error) {
        showPopup("Error: " + error.message);
        console.error("Login error:", error);
    }
}

// Signup
async function handleSignup(e) {
    e.preventDefault();
    
    const name = document.getElementById("signupUsername").value;
    const email = document.getElementById("signupEmail").value;
    const password = document.getElementById("signupPassword").value;
    
    if (!name || !email || !password) {
        showPopup("Please fill in all fields");
        return;
    }
    
    try {
        const response = await fetch("/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ name, email, password })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            closeSignupModal();
            openLoginModal();
        } else {
            showPopup(result.error || "Signup failed");
        }
    } catch (error) {
        showPopup("Error: " + error.message);
        console.error("Signup error:", error);
    }
}

// Logout
function handleLogout() {
    localStorage.removeItem("authToken");
    showPopup("You have been logged out");
    checkAuthStatus();
    loadSalons();
}

// Close modals when clicking outside
window.addEventListener("click", (e) => {
    const loginModal = document.getElementById("loginModal");
    const signupModal = document.getElementById("signupModal");
    const salonFormModal = document.getElementById("salonFormModal");
    const popupContainer = document.getElementById("popupContainer");
    
    // Close login modal
    if (e.target === loginModal) {
        closeLoginModal();
    }
    
    // Close signup modal
    if (e.target === signupModal) {
        closeSignupModal();
    }
    
    // Close salon form modal
    if (e.target === salonFormModal) {
        closeSalonFormModal();
    }
    
    // Close popup when clicking on the overlay background
    if (e.target === popupContainer) {
        closePopup();
    }
});

// Check auth status on app initialization
document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => checkAuthStatus(), 500);
});