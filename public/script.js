// Supabase Configuration
let SUPABASE_URL = "";
let SUPABASE_ANON_KEY = "";

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const config = await loadConfig()
        SUPABASE_URL = config.SUPABASE_URL;
        SUPABASE_ANON_KEY = config.SUPABASE_ANON_KEY;
        await loadSalons();
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

// Initialize home page
document.addEventListener("DOMContentLoaded", () => {
    loadSalons();
});

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

        salons.forEach(salon => {
            const card = document.createElement("div");
            card.className = "card";
            card.innerHTML = `
                <div class="card-header">
                    <h3>${salon.name}</h3>
                </div>
                <div class="card-body">
                    <img src="${salon.img}" alt="${salon.name} Image" style="width:100%; height:auto;"/>
                    <p><strong>Location:</strong> ${salon.city}</p>
                    <p><strong>Services:</strong> ${salon.services}</p>
                    <p><strong>Medium range price:</strong> ${salon.m_range_price}</p>
                    <p><strong>Review:</strong> ${salon.review}</p>
                    <p><strong>Working hours:</strong> ${salon.working_h}</p>
                    <p><strong>Status:</strong> ${salon.status}</p>
                    <div class="card-actions">
                        <button class="edit-btn" onclick="editSalon(${salon.id})">Edit</button>
                        <button class="delete-btn" onclick="deleteSalon(${salon.id})">Delete</button>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    } catch (error) {
        grid.innerHTML = `<p style="color: red;">Error loading salons: ${error.message}</p>`;
        console.error("Error:", error);
    }
}