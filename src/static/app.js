document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const adminPasswordInput = document.getElementById("admin-password");
  const adminToggleButton = document.getElementById("admin-toggle");
  const adminStatus = document.getElementById("admin-status");
  const ADMIN_PASSWORD = "admin123";

  let adminMode = false;

  function showMessage(text, type = "info") {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function setAdminMode(enabled) {
    adminMode = enabled;
    adminToggleButton.textContent = enabled ? "Disable admin mode" : "Enable admin mode";
    adminStatus.textContent = enabled
      ? "Admin mode is on. Teacher controls are available."
      : "Admin mode is off.";
    adminStatus.className = enabled ? "success" : "info";
    fetchActivities();
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message and selection
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        const deleteButtonsHTML = adminMode
          ? details.participants
              .map(
                (email) =>
                  `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
              )
              .join("")
          : "";

        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${deleteButtonsHTML ||
                  '<li><span class="participant-email">Student roster is hidden while admin mode is off.</span></li>'}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  adminToggleButton.addEventListener("click", () => {
    const enteredPassword = adminPasswordInput.value.trim();

    if (!enteredPassword) {
      showMessage("Enter the admin password to enable admin mode.", "error");
      return;
    }

    if (enteredPassword === ADMIN_PASSWORD) {
      setAdminMode(true);
      showMessage("Admin mode enabled.", "success");
      adminPasswordInput.value = "";
      return;
    }

    setAdminMode(false);
    showMessage("Incorrect admin password.", "error");
    adminPasswordInput.value = "";
  });

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    if (!adminMode) {
      showMessage("Admin mode is required before removing students.", "error");
      return;
    }

    const adminPassword = adminPasswordInput.value.trim() || ADMIN_PASSWORD;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}&admin_password=${encodeURIComponent(adminPassword)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  setAdminMode(false);
  fetchActivities();
});
