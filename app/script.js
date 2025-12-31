// Supabase Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

// Initialize home page
document.addEventListener("DOMContentLoaded", () => {
    loadSalons();
});

// Load salons function
async function loadSalons() {
    const grid = document.getElementById("grid");
    grid.textContent = "Loading...";

    try {
        const response = await fetch("https://isuhkkjfesdnsigufdrx.supabase.co/rest/v1/salon");
        
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
                    <p><strong>Location:</strong> ${salon.location}</p>
                    <p><strong>Phone:</strong> ${salon.phone}</p>
                    <p><strong>Description:</strong> ${salon.description}</p>
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