// Configuration
let SUPABASE_URL = "";
let SUPABASE_ANON_KEY = "";
// Pagination variables
let currentPage = 1;
const itemsPerPage = 6;
let allSalonsData = [];
let userFavorites = []; // Store user's favorite salon IDs

//toggle menu
const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");

if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", function() {
        this.classList.toggle("active");
        navLinks.classList.toggle("active");
        
        // Toggle body scroll when menu is open
        if (navLinks.classList.contains("active")) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
    });
    
    // Close menu when clicking on a link
    const navLinksItems = navLinks.querySelectorAll("a, button");
    navLinksItems.forEach(item => {
        item.addEventListener("click", () => {
            menuToggle.classList.remove("active");
            navLinks.classList.remove("active");
            document.body.style.overflow = "";
        });
    });
}
//supabase config 
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

// Cookie Helper Functions
function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Strict";
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function deleteCookie(name) {
    document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}

function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

// Confirm Popup Functions
function showConfirmPopup(message, onConfirm) {
    const confirmPopup = document.getElementById("confirmPopup");
    const confirmMessage = document.getElementById("confirmMessage");
    const confirmYes = document.getElementById("confirmYes");
    const confirmNo = document.getElementById("confirmNo");

    if (confirmPopup && confirmMessage) {
        confirmMessage.textContent = message;
        confirmPopup.classList.add("active");

        // Handle Yes click
        confirmYes.onclick = function () {
            onConfirm();
            closeConfirmPopup();
        };

        // Handle No click
        confirmNo.onclick = closeConfirmPopup;

        // Handle click outside
        confirmPopup.onclick = function (e) {
            if (e.target === confirmPopup) {
                closeConfirmPopup();
            }
        };
    }
}

function closeConfirmPopup() {
    const confirmPopup = document.getElementById("confirmPopup");
    if (confirmPopup) {
        confirmPopup.classList.remove("active");
    }
}


//Modal Functions 
function openSalonFormModal() {
    const modal = document.getElementById("salonFormModal");
    const salonForm = document.getElementById("salonForm");

    if (modal) {
        modal.classList.add("active");
        salonForm.reset();

        // Reset edit mode
        salonForm.dataset.isEdit = "false";
        delete salonForm.dataset.salonId;

        // Set submit handler to AddSalon
        salonForm.onsubmit = AddSalon;

        // Reset button text
        const submitBtn = document.querySelector("#salonForm button[type='submit']");
        if (submitBtn) {
            submitBtn.textContent = "Add Salon";
        }
    }
}

function closeSalonFormModal() {
    const modal = document.getElementById("salonFormModal");
    const salonForm = document.getElementById("salonForm");

    if (modal) {
        modal.classList.remove("active");
        salonForm.reset();

        // Reset edit mode
        salonForm.dataset.isEdit = "false";
        delete salonForm.dataset.salonId;

        // Reset button text
        const submitBtn = document.querySelector("#salonForm button[type='submit']");
        if (submitBtn) {
            submitBtn.textContent = "Add Salon";
        }
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
    const userDisplay = document.getElementById("userDisplay");

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

    // User Display - Show Favorites Modal
    if (userDisplay) {
        userDisplay.addEventListener("click", openFavoritesModal);
    }

    // Favorites Modal listeners
    const closeFavoritesBtn = document.getElementById("closeFavoritesBtn");
    if (closeFavoritesBtn) {
        closeFavoritesBtn.addEventListener("click", closeFavoritesModal);
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

    // Search and Filter listeners
    const searchInput = document.getElementById("searchInput");
    const cityFilter = document.getElementById("cityFilter");
    const clearFiltersBtn = document.getElementById("clearFilters");
    const scrapingBtn = document.getElementById("scrapingBtn");

    if (scrapingBtn) {
        scrapingBtn.addEventListener("click", () => {
            const authToken = getCookie("authToken");
            if (!authToken) {
                showPopup("Please login to use this feature");
                return;
            }
            // Logic for Find Salons would go here
            showPopup("Feature coming soon!");
        });
    }

    if (searchInput) {
        searchInput.addEventListener("input", () => {
            currentPage = 1;
            renderSalons();
        });
    }

    if (cityFilter) {
        cityFilter.addEventListener("change", () => {
            currentPage = 1;
            renderSalons();
        });
    }

    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener("click", () => {
            if (searchInput) searchInput.value = "";
            if (cityFilter) cityFilter.value = "";
            currentPage = 1;
            renderSalons();
        });
    }

    // Popup OK button - using event delegation
    document.addEventListener("click", function (e) {
        if (e.target && (e.target.id === "popupOk" || e.target.classList.contains("popupOk"))) {
            closePopup();
        }
    });

        
    // Page navigation listeners
    document.querySelectorAll('.nav-link').forEach(link => {
        // Skip buttons
        if (link.tagName === 'BUTTON') return;
        
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const pageName = link.textContent.toLowerCase();
            showPage(pageName);
        });
    });
    
    // Handle logo click
    const logoLink = document.querySelector('.nav-logo a');
    if (logoLink) {
        logoLink.addEventListener('click', (e) => {
            e.preventDefault();
            showPage('home');
        });
    }
    
    // Contact form listener
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', handleContactForm);
    }
    
    // Show home page by default on load
    setTimeout(() => {
        showPage('home');
    }, 100);
}

// Close popup function
function closePopup() {
    const popupContainer = document.getElementById("popupContainer");
    if (popupContainer) {
        popupContainer.classList.remove("active");
    }
}

// Load user favorites
async function loadUserFavorites() {
    const authToken = getCookie("authToken");

    if (!authToken) {
        userFavorites = [];
        return;
    }

    try {
        const response = await fetch('/fav_salon', {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const favorites = await response.json();
            userFavorites = favorites.map(fav => fav.id_salon);
        } else {
            userFavorites = [];
        }
    } catch (error) {
        console.error("Error loading favorites:", error);
        userFavorites = [];
    }
}

// Load salons function
async function loadSalons() {
    const grid = document.getElementById("grid");
    grid.textContent = "Loading...";

    try {
        // Load favorites first if user is logged in
        await loadUserFavorites();

        const response = await fetch('/salon');

        if (!response.ok) {
            throw new Error("Failed to fetch salons");
        }

        allSalonsData = await response.json();

        if (!allSalonsData || allSalonsData.length === 0) {
            grid.innerHTML = "";
            grid.textContent = "No salons found.";
            document.getElementById("pagination").innerHTML = "";
            return;
        }

        populateCityFilter(allSalonsData);
        renderSalons();

    } catch (error) {
        grid.innerHTML = `<p style="color: red;">Error loading salons: ${error.message}</p>`;
        console.error("Error:", error);
    }
}

function populateCityFilter(salons) {
    const cityFilter = document.getElementById("cityFilter");
    if (!cityFilter) return;

    // Get unique cities
    const cities = [...new Set(salons.map(salon => salon.city).filter(city => city))].sort();

    // Save current selection if any
    const currentSelection = cityFilter.value;

    // Reset options
    cityFilter.innerHTML = '<option value="">All Cities</option>';

    cities.forEach(city => {
        const option = document.createElement("option");
        option.value = city;
        option.textContent = city;
        cityFilter.appendChild(option);
    });

    // Restore selection if valid
    if (cities.includes(currentSelection)) {
        cityFilter.value = currentSelection;
    }
}

function renderSalons() {
    const grid = document.getElementById("grid");
    const searchInput = document.getElementById("searchInput");
    const cityFilter = document.getElementById("cityFilter");

    const searchText = searchInput ? searchInput.value.toLowerCase() : "";
    const selectedCity = cityFilter ? cityFilter.value : "";

    // Filter data
    const filteredSalons = allSalonsData.filter(salon => {
        const matchesSearch = !searchText ||
            (salon.name && salon.name.toLowerCase().includes(searchText)) ||
            (salon.city && salon.city.toLowerCase().includes(searchText)) ||
            (Array.isArray(salon.services) && salon.services.join(' ').toLowerCase().includes(searchText)) ||
            (typeof salon.services === 'string' && salon.services.toLowerCase().includes(searchText));

        const matchesCity = !selectedCity || salon.city === selectedCity;

        return matchesSearch && matchesCity;
    });

    grid.innerHTML = "";

    if (filteredSalons.length === 0) {
        grid.textContent = "No salons found matching your criteria.";
        document.getElementById("pagination").innerHTML = "";
        return;
    }

    // Calculate pagination on filtered results
    const totalPages = Math.ceil(filteredSalons.length / itemsPerPage);

    // Ensure currentPage is valid
    if (currentPage > totalPages) currentPage = 1;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const salonsToDisplay = filteredSalons.slice(startIndex, endIndex);

    // Check if user is logged in
    const isLoggedIn = !!getCookie("authToken");

    salonsToDisplay.forEach((salon) => {
        const card = document.createElement("div");
        card.className = "card";

        // Check if salon is favorited
        const isFavorited = userFavorites.includes(salon.id_salon);
        const favClass = isFavorited ? 'favorited' : '';

        //edit and delete buttons based on login status
        const actionButtons = isLoggedIn ? `
                <div class="card-actions">
                    <button class="edit-btn" onclick="editSalon('${salon.id_salon}')">Edit</button>
                    <button class="delete-btn" onclick="deleteSalon('${salon.id_salon}')">Delete</button>
                </div>
        ` : '';

        card.innerHTML = `
            <div class="card-header">
                <h3>${salon.name}</h3>
            </div>
            <div class="card-body">
                <div class="image-container">
                    <img src="${salon.img}" alt="${salon.name} Image" class="salon-image"/>
                    ${isLoggedIn ? `<button class="favorite-btn ${favClass}" onclick="toggleFavorite('${salon.id_salon}')" title="${isFavorited ? 'Remove from Favorites' : 'Add to Favorites'}">♥</button>` : ''}
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

    // Create pagination with filtered count
    createPagination(filteredSalons.length);
}

//Add Salon Function
async function AddSalon(e) {
    e.preventDefault();

    const authToken = getCookie("authToken");

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
    const authToken = getCookie("authToken");

    if (!authToken) {
        showPopup("Please login to edit salons");
        return;
    }

    // Fetch the salon data
    fetch(`/salon/${salonId}`)
        .then(response => response.json())
        .then(data => {
            if (data && data.length > 0) {
                const salon = data[0];

                // Populate form with existing data
                document.getElementById("salonName").value = salon.name || "";
                document.getElementById("salonServices").value = Array.isArray(salon.services) ? salon.services.join(", ") : salon.services || "";
                document.getElementById("salonCity").value = salon.city || "";
                document.getElementById("salonPrice").value = salon.m_range_price || "";
                document.getElementById("salonRating").value = salon.review || "";
                document.getElementById("salonHours").value = salon.working_h || "";
                document.getElementById("salonStatus").value = salon.status || "";
                document.getElementById("salonImage").value = salon.img || "";

                // Store the salon ID for update
                const salonForm = document.getElementById("salonForm");
                salonForm.dataset.salonId = salonId;
                salonForm.dataset.isEdit = "true";

                // Set submit handler to Update logic
                salonForm.onsubmit = async function (e) {
                    e.preventDefault();

                    const authToken = getCookie("authToken");

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
                        const response = await fetch(`/salon/${salonId}`, {
                            method: "PUT",
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${authToken}`
                            },
                            body: JSON.stringify(salonData)
                        });

                        const result = await response.json();

                        if (response.ok) {
                            showPopup("Salon updated successfully!");
                            closeSalonFormModal();
                            loadSalons();
                        } else {
                            showPopup(result.error || "Error updating salon");
                        }
                    } catch (error) {
                        showPopup("Error: " + error.message);
                        console.error("Error:", error);
                    }
                };

                // Change button text
                const submitBtn = document.querySelector("#salonForm button[type='submit']");
                if (submitBtn) {
                    submitBtn.textContent = "Update Salon";
                }

                // Open the modal
                const modal = document.getElementById("salonFormModal");
                if (modal) {
                    modal.classList.add("active");
                }
            }
        })
        .catch(error => {
            showPopup("Error loading salon data: " + error.message);
            console.error("Error:", error);
        });
}

//Delete Salon
function deleteSalon(salonId) {
    showConfirmPopup("Are you sure you want to delete this salon?", () => {
        const authToken = getCookie("authToken");

        if (!authToken) {
            showPopup("Please login to delete salons");
            return;
        }

        fetch(`/salon/${salonId}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${authToken}`
            }
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showPopup("Salon deleted successfully!");
                    loadSalons();
                } else {
                    showPopup(data.error || "Error deleting salon");
                }
            })
            .catch(error => {
                showPopup("Error: " + error.message);
                console.error("Error:", error);
            });
    });
}

// Toggle Favorite (Add/Remove)
async function toggleFavorite(salonId) {
    const authToken = getCookie("authToken");

    if (!authToken) {
        showPopup("Please login to manage favorites");
        return;
    }

    const isFavorited = userFavorites.includes(salonId);

    try {
        if (isFavorited) {
            // Remove from favorites
            const response = await fetch(`/fav_salon/${salonId}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${authToken}`
                }
            });

            const data = await response.json();

            if (response.ok) {
                showPopup("Salon removed from favorites!");
                // Update local favorites array
                userFavorites = userFavorites.filter(id => id !== salonId);
                // Re-render to update heart icon
                renderSalons();
            } else {
                showPopup(data.error || "Error removing from favorites");
            }
        } else {
            // Add to favorites
            const response = await fetch(`/fav_salon/${salonId}`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${authToken}`
                }
            });

            const data = await response.json();

            if (response.ok) {
                showPopup("Salon added to favorites!");
                // Update local favorites array
                userFavorites.push(salonId);
                // Re-render to update heart icon
                renderSalons();
            } else {
                showPopup(data.error || "Error adding to favorites");
            }
        }
    } catch (error) {
        showPopup("Error: " + error.message);
        console.error("Error:", error);
    }
}

// Open Favorites Modal
async function openFavoritesModal() {
    const authToken = getCookie("authToken");

    if (!authToken) {
        showPopup("Please login to view favorites");
        return;
    }

    const modal = document.getElementById("favoritesModal");
    const favoritesGrid = document.getElementById("favoritesGrid");

    if (!modal || !favoritesGrid) return;

    try {
        // Fetch user's favorite salons
        const response = await fetch('/fav_salon', {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${authToken}`
            }
        });

        if (!response.ok) {
            throw new Error("Failed to fetch favorites");
        }

        const favorites = await response.json();

        // Clear the grid
        favoritesGrid.innerHTML = "";

        if (favorites.length === 0) {
            favoritesGrid.innerHTML = '<div class="no-favorites">You have no favorite salons yet. Start adding some!</div>';
        } else {
            favorites.forEach(salon => {
                const favItem = document.createElement("div");
                favItem.className = "favorite-item";

                favItem.innerHTML = `
                    <div class="favorite-item-image">
                        <img src="${salon.img}" alt="${salon.name}">
                    </div>
                    <div class="favorite-item-content">
                        <h4>${salon.name}</h4>
                        <p><strong>Location:</strong> ${salon.city}</p>
                        <p><strong>Services:</strong> ${Array.isArray(salon.services) ? salon.services.join(', ') : salon.services}</p>
                        <p><strong>Price Range:</strong> ${salon.m_range_price}</p>
                        <p><strong>Rating:</strong> ⭐ ${salon.review}</p>
                        <button class="remove-favorite-btn" onclick="removeFavoriteFromModal('${salon.id_salon}')">Remove from Favorites</button>
                    </div>
                `;

                favoritesGrid.appendChild(favItem);
            });
        }

        modal.classList.add("active");
    } catch (error) {
        showPopup("Error loading favorites: " + error.message);
        console.error("Error:", error);
    }
}

// Close Favorites Modal
function closeFavoritesModal() {
    const modal = document.getElementById("favoritesModal");
    if (modal) {
        modal.classList.remove("active");
    }
}

// Remove favorite from modal
async function removeFavoriteFromModal(salonId) {
    const authToken = getCookie("authToken");

    if (!authToken) {
        showPopup("Please login to manage favorites");
        return;
    }

    try {
        const response = await fetch(`/fav_salon/${salonId}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${authToken}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            showPopup("Salon removed from favorites!");
            // Update local favorites array
            userFavorites = userFavorites.filter(id => id !== salonId);
            // Reload favorites modal
            openFavoritesModal();
            // Re-render main salons to update heart icons
            renderSalons();
        } else {
            showPopup(data.error || "Error removing from favorites");
        }
    } catch (error) {
        showPopup("Error: " + error.message);
        console.error("Error:", error);
    }
}


// AUTHENTICATION FUNCTIONS

// Check if user is logged in on page load
function checkAuthStatus() {
    const token = getCookie("authToken");
    const loginBtn = document.getElementById("loginBtn");
    const signupBtn = document.getElementById("signupBtn");
    const logoutBtn = document.getElementById("logoutBtn");
    const showAddFormBtn = document.getElementById("showAddFormBtn");
    const scrapingBtn = document.getElementById("scrapingBtn");

    if (token) {
        // Check if token is expired
        const decodedToken = parseJwt(token);
        if (decodedToken && decodedToken.exp * 1000 < Date.now()) {
            // Token expired
            handleLogout();
            return;
        }

        // User is logged in
        if (loginBtn) loginBtn.style.display = "none";
        if (signupBtn) signupBtn.style.display = "none";
        if (logoutBtn) logoutBtn.style.display = "block";
        if (showAddFormBtn) showAddFormBtn.style.display = "block";
        if (scrapingBtn) scrapingBtn.style.display = "inline-block";

        const userDisplay = document.getElementById("userDisplay");
        const username = getCookie("username");
        if (userDisplay && username) {
            userDisplay.textContent = username;
            userDisplay.style.display = "inline-block";
        }
    } else {
        // User is not logged in
        if (loginBtn) loginBtn.style.display = "block";
        if (signupBtn) signupBtn.style.display = "block";
        if (logoutBtn) logoutBtn.style.display = "none";
        if (showAddFormBtn) showAddFormBtn.style.display = "none";
        if (scrapingBtn) scrapingBtn.style.display = "none";
        const userDisplay = document.getElementById("userDisplay");
        if (userDisplay) userDisplay.style.display = "none";
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
            // Store token in cookie for 1 day
            setCookie("authToken", result.token, 1);
            // Store username in cookie for 1 day
            setCookie("username", username, 1);

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
    deleteCookie("authToken");
    deleteCookie("username");
    userFavorites = [];
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
    const favoritesModal = document.getElementById("favoritesModal");

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

    // Close favorites modal
    if (e.target === favoritesModal) {
        closeFavoritesModal();
    }
});

// Check auth status on app initialization
document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => checkAuthStatus(), 500);
});

// Create pagination buttons
function createPagination(totalItems) {
    const container = document.getElementById('pagination');
    container.innerHTML = '';

    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return;

    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '←';
    prevBtn.className = 'pagination-btn';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            renderSalons();
        }
    };
    container.appendChild(prevBtn);

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        pageBtn.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
        pageBtn.onclick = () => {
            currentPage = i;
            renderSalons();
        };
        container.appendChild(pageBtn);
    }

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.textContent = '→';
    nextBtn.className = 'pagination-btn';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderSalons();
        }
    };
    container.appendChild(nextBtn);
}

// Page Navigation Functionality
function showPage(pageName) {
    // Hide all pages
    document.querySelectorAll('.page-content').forEach(page => {
        page.style.display = 'none';
    });
    
    // Show selected page
    const pageElement = document.getElementById(pageName + 'Page');
    if (pageElement) {
        pageElement.style.display = 'block';
        
        // If showing home page, ensure salon section is loaded
        if (pageName === 'home') {
            // Small delay to ensure DOM is ready
            setTimeout(() => {
                if (allSalonsData.length === 0) {
                    loadSalons();
                }
            }, 100);
        }
    }
    
    // Update active navigation link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Set active link
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.textContent.toLowerCase() === pageName.toLowerCase()) {
            link.classList.add('active');
        }
    });
    
    // Also activate the logo if it's a link to home
    const logoLink = document.querySelector('.nav-logo a');
    if (logoLink && pageName === 'home') {
        // Remove active class from all nav-links first
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        // Add active to home link
        const homeLink = document.querySelector('.nav-link[onclick*="home"]');
        if (homeLink) {
            homeLink.classList.add('active');
        }
    }
    
    // Close mobile menu if open
    const menuToggle = document.getElementById('menuToggle');
    const navLinks = document.getElementById('navLinks');
    if (menuToggle && navLinks && navLinks.classList.contains('active')) {
        menuToggle.classList.remove('active');
        navLinks.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    // Scroll to top when switching pages
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Contact Form Handler
function handleContactForm(e) {
    e.preventDefault();
    
    const name = document.getElementById('contactName').value;
    const email = document.getElementById('contactEmail').value;
    const subject = document.getElementById('contactSubject').value;
    const message = document.getElementById('contactMessage').value;
    
    // Basic validation
    if (!name || !email || !subject || !message) {
        showPopup('Please fill in all required fields.');
        return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showPopup('Please enter a valid email address.');
        return;
    }
    
    // Here you would typically send the form data to a server
    // For now, we'll just show a success message
    showPopup('Thank you for your message! We will get back to you soon.');
    
    // Reset form
    document.getElementById('contactForm').reset();
}
