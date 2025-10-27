document.addEventListener("DOMContentLoaded", () => {
        // --- DOM Elements ---
        const searchInput = document.getElementById("search");
        const searchBtn = document.getElementById("search-btn");
        const searchBtnText = searchBtn.querySelector(".btn-text");
        const searchBtnSpinner = searchBtn.querySelector(".spinner-sm");

        const profileContainer = document.getElementById("profile-container");
        const errorContainer = document.getElementById("error-container");
        const errorTitle = document.getElementById("error-title");
        const errorMessage = document.getElementById("error-message");
        const welcomeContainer = document.getElementById("welcome-container");

        const avatar = document.getElementById("avatar");
        const nameElement = document.getElementById("name");
        const usernameElement = document.getElementById("username");
        const hireableBadge = document.getElementById("hireable-badge");
        const bioElement = document.getElementById("bio");
        const locationElement = document.getElementById("location");
        const joinedDateElement = document.getElementById("joined-date");
        const profileLink = document.getElementById("profile-link");

        const followers = document.getElementById("followers");
        const following = document.getElementById("following");
        const repos = document.getElementById("repos");
        const gists = document.getElementById("gists");

        const companyElement = document.getElementById("company");
        const blogElement = document.getElementById("blog");
        const twitterElement = document.getElementById("twitter");
        const emailElement = document.getElementById("email");
        const companyContainer = document.getElementById("company-container");
        const blogContainer = document.getElementById("blog-container");
        const twitterContainer = document.getElementById("twitter-container");
        const emailContainer = document.getElementById("email-container");

        const reposContainer = document.getElementById("repos-container");
        const sortSelect = document.getElementById("sort-select");

        const themeToggle = document.getElementById("theme-toggle");
        const searchHistoryContainer =
          document.getElementById("search-history");
        const clearHistoryBtn = document.getElementById("clear-history-btn");

        const languageChartCanvas = document.getElementById("language-chart");
        const noChartData = document.getElementById("no-chart-data");
        let languageChart = null; // To hold the Chart.js instance

        // --- State ---
        let currentUsername = null;

        // --- Language Colors Map ---
        // (Curated for better visuals)
        const languageColors = {
          JavaScript: "#f1e05a",
          TypeScript: "#3178c6",
          Python: "#3572A5",
          Java: "#b07219",
          HTML: "#e34c26",
          CSS: "#563d7c",
          PHP: "#4F5D95",
          Ruby: "#701516",
          "C++": "#f34b7d",
          C: "#555555",
          Shell: "#89e051",
          Go: "#00ADD8",
          Swift: "#F05138",
          Kotlin: "#A97BFF",
          Rust: "#dea584",
          Vue: "#41b883",
          Dart: "#00B4AB",
          SCSS: "#C6538C",
          Svelte: "#ff3e00",
          Other: "#ccc",
        };

        // --- Event Listeners ---
        searchBtn.addEventListener("click", searchUser);
        searchInput.addEventListener("keypress", (e) => {
          if (e.key === "Enter") searchUser();
        });
        themeToggle.addEventListener("click", toggleTheme);
        clearHistoryBtn.addEventListener("click", clearSearchHistory);
        sortSelect.addEventListener("change", () => {
          if (currentUsername) {
            fetchRepositories(currentUsername, sortSelect.value);
          }
        });
        searchHistoryContainer.addEventListener("click", (e) => {
          if (e.target.classList.contains("history-item")) {
            searchInput.value = e.target.textContent;
            searchUser();
          }
        });

        // --- Theme Toggle Logic ---
        function applyTheme(theme) {
          document.documentElement.setAttribute("data-theme", theme);
          localStorage.setItem("theme", theme);
          // Update chart colors if it exists
          if (languageChart) {
            updateChartTheme(theme);
          }
        }

        function toggleTheme() {
          const currentTheme =
            document.documentElement.getAttribute("data-theme");
          const newTheme = currentTheme === "dark" ? "light" : "dark";
          applyTheme(newTheme);
        }

        // --- Search History Logic ---
        function getSearchHistory() {
          return JSON.parse(localStorage.getItem("searchHistory")) || [];
        }

        function saveSearch(username) {
          let history = getSearchHistory();
          history = history.filter(
            (item) => item.toLowerCase() !== username.toLowerCase()
          );
          history.unshift(username);
          history = history.slice(0, 5); // Keep last 5
          localStorage.setItem("searchHistory", JSON.stringify(history));
          displaySearchHistory();
        }

        function displaySearchHistory() {
          const history = getSearchHistory();
          searchHistoryContainer.innerHTML = "";
          if (history.length > 0) {
            history.forEach((username) => {
              const item = document.createElement("button");
              item.className = "history-item";
              item.textContent = username;
              searchHistoryContainer.appendChild(item);
            });
            clearHistoryBtn.classList.remove("hidden");
          } else {
            clearHistoryBtn.classList.add("hidden");
          }
        }

        function clearSearchHistory() {
          localStorage.removeItem("searchHistory");
          displaySearchHistory();
        }

        // --- Main Search Function ---
        async function searchUser() {
          const username = searchInput.value.trim();
          if (!username) return;

          toggleLoading(true);
          hideAllContainers();

          try {
            const response = await fetch(
              `https://api.github.com/users/${username}`
            );

            if (!response.ok) {
              if (response.status === 404) {
                throw new Error("User not found");
              } else if (response.status === 403) {
                throw new Error("API rate limit exceeded. Please wait a moment.");
              } else {
                throw new Error(`Error: ${response.statusText}`);
              }
            }

            const userData = await response.json();
            currentUsername = userData.login; // Store username for sorting
            displayUserData(userData);
            await fetchRepositories(currentUsername, sortSelect.value);
            saveSearch(currentUsername);
          } catch (error)
          {
            showError(error.message);
            currentUsername = null;
          } finally
          {
            toggleLoading(false);
          }
        }

        // --- Repo Fetch & Display ---
        async function fetchRepositories(username, sort) {
          reposContainer.innerHTML =
            '<div class="repo-loader-container"><div class="spinner-sm" style="margin: 0 auto; border-top-color: var(--primary-color);"></div></div>';
          
          // Reset chart
          if (languageChart) languageChart.destroy();
          noChartData.classList.add("hidden");
          languageChartCanvas.classList.remove("hidden");

          try {
            const sortParam = `sort=${sort === 'stargazers_count' ? 'stars' : sort}&direction=desc`;
            const response = await fetch(
              `https://api.github.com/users/${username}/repos?${sortParam}&per_page=6`
            );
            if (!response.ok) throw new Error("Could not fetch repositories.");

            const reposData = await response.json();
            displayRepos(reposData);
            createLanguageChart(reposData); // Create chart *after* displaying repos
          } catch (error) {
            reposContainer.innerHTML = `<div class="no-repos">${error.message}</div>`;
            languageChartCanvas.classList.add("hidden");
            noChartData.classList.remove("hidden");
          }
        }

        function displayRepos(reposData) {
          if (reposData.length === 0) {
            reposContainer.innerHTML = `
              <div class="no-repos">
                <i class="fas fa-folder-open"></i>
                No public repositories found
              </div>`;
            return;
          }

          reposContainer.innerHTML = "";
          reposData.forEach((repo) => {
            const repoCard = document.createElement("div");
            repoCard.className = "repo-card";
            const language = repo.language || "Other";
            const langColor = languageColors[language] || languageColors.Other;

            repoCard.innerHTML = `
              <div>
                <a href="${repo.html_url}" target="_blank" class="repo-name">
                  <i class="fas fa-book-bookmark"></i> ${repo.name}
                </a>
                <p class="repo-description">${
                  repo.description || "No description available"
                }</p>
              </div>
              <div class="repo-meta">
                ${
                  repo.language
                    ? `
                  <div class="repo-meta-item">
                    <span class="language-dot" style="background-color: ${langColor}"></span> ${language}
                  </div>
                `
                    : ""
                }
                <div class="repo-meta-item">
                  <i class="fas fa-star"></i> ${repo.stargazers_count}
                </div>
                <div class="repo-meta-item">
                  <i class="fas fa-code-fork"></i> ${repo.forks_count}
                </div>
                <div class="repo-meta-item">
                  <i class="fas fa-calendar-alt"></i> ${formatDate(repo.updated_at, true)}
                </div>
              </div>
            `;
            reposContainer.appendChild(repoCard);
          });
        }

        // --- Chart.js Logic ---
        function createLanguageChart(reposData) {
          const langCount = reposData.reduce((acc, repo) => {
            const lang = repo.language || "Other";
            acc[lang] = (acc[lang] || 0) + 1;
            return acc;
          }, {});

          const labels = Object.keys(langCount);
          const data = Object.values(langCount);
          const backgroundColors = labels.map(
            (lang) => languageColors[lang] || languageColors.Other
          );

          if (labels.length === 0) {
            languageChartCanvas.classList.add("hidden");
            noChartData.classList.remove("hidden");
            return;
          }

          languageChartCanvas.classList.remove("hidden");
          noChartData.classList.add("hidden");

          const currentTheme = document.documentElement.getAttribute("data-theme");
          const textColor =
            currentTheme === "light"
              ? "var(--text-secondary)"
              : "var(--text-primary)";

          const ctx = languageChartCanvas.getContext("2d");
          languageChart = new Chart(ctx, {
            type: "doughnut",
            data: {
              labels: labels,
              datasets: [
                {
                  label: "Repositories",
                  data: data,
                  backgroundColor: backgroundColors,
                  borderColor:
                    currentTheme === "light"
                      ? "var(--bg-card)"
                      : "var(--bg-main)",
                  borderWidth: 2,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: "bottom",
                  labels: {
                    color: textColor,
                    font: { family: "'Inter', sans-serif" },
                    boxWidth: 12,
                    padding: 15,
                  },
                },
                tooltip: {
                  titleFont: { family: "'Inter', sans-serif" },
                  bodyFont: { family: "'Inter', sans-serif" },
                }
              },
            },
          });
        }

        function updateChartTheme(theme) {
          if (!languageChart) return;
          const textColor =
            theme === "light"
              ? "var(--text-secondary)"
              : "var(--text-primary)";
          
          languageChart.options.plugins.legend.labels.color = textColor;
          languageChart.options.datasets[0].borderColor = theme === 'light' ? 'var(--bg-card)' : 'var(--bg-main)';
          languageChart.update();
        }

        // --- User Data Display ---
        function displayUserData(user) {
          avatar.src = user.avatar_url;
          nameElement.textContent = user.name || user.login;
          usernameElement.textContent = `@${user.login}`;
          bioElement.textContent = user.bio || "No bio available";
          profileLink.href = user.html_url;

          followers.textContent = user.followers;
          following.textContent = user.following;
          repos.textContent = user.public_repos;
          gists.textContent = user.public_gists;

          hireableBadge.classList.toggle("hidden", !user.hireable);

          updateInfoItem(
            locationElement,
            user.location,
            "Not specified"
          );
          updateInfoItem(
            joinedDateElement,
            formatDate(user.created_at, false),
            "N/A"
          );

          // Handle optional info
          updateInfoItem(
            companyElement,
            user.company,
            "Not specified"
          );
          updateInfoItem(
            blogElement,
            user.blog,
            "No website",
            user.blog ? (user.blog.startsWith("http") ? user.blog : `https://${user.blog}`) : null
          );
          updateInfoItem(
            twitterElement,
            user.twitter_username ? `@${user.twitter_username}` : null,
            "No Twitter",
            user.twitter_username ? `https://twitter.com/${user.twitter_username}` : null
          );
          updateInfoItem(
            emailElement,
            user.email,
            "No public email",
            user.email ? `mailto:${user.email}` : null
          );

          profileContainer.classList.remove("hidden");
          setTimeout(() => {
            profileContainer.classList.add("visible");
          }, 10);
        }

        // --- UI Helper Functions ---
        function updateInfoItem(element, text, defaultText, href = null) {
          if (text) {
            element.textContent = text;
            element.classList.remove("not-specified");
            if (element.tagName === "A") {
              element.href = href;
              element.style.pointerEvents = "auto";
              element.style.textDecoration = "";
            }
          } else {
            element.textContent = defaultText;
            element.classList.add("not-specified");
            if (element.tagName === "A") {
              element.href = "#";
              element.style.pointerEvents = "none";
              element.style.textDecoration = "none";
            }
          }
        }

        function hideAllContainers() {
          errorContainer.classList.add("hidden");
          welcomeContainer.classList.add("hidden");
          profileContainer.classList.add("hidden");
          profileContainer.classList.remove("visible"); // For animations
        }

        function toggleLoading(isLoading) {
          searchBtn.disabled = isLoading;
          if (isLoading) {
            searchBtnText.classList.add("hidden");
            searchBtnSpinner.classList.remove("hidden");
          } else {
            searchBtnText.classList.remove("hidden");
            searchBtnSpinner.classList.add("hidden");
          }
        }

        function showError(message) {
          hideAllContainers();
          if (message.includes("User not found")) {
            errorTitle.textContent = "User Not Found";
            errorMessage.textContent =
              "We couldn't find a user with that name. Please try again.";
          } else if (message.includes("API rate limit")) {
            errorTitle.textContent = "Rate Limit Exceeded";
            errorMessage.textContent =
              "You've made too many requests. Please wait a moment and try again.";
          } else {
            errorTitle.textContent = "An Error Occurred";
            errorMessage.textContent = message;
          }
          errorContainer.classList.remove("hidden");
        }

        function formatDate(dateString, isRepoUpdate = false) {
          if (!dateString) return "N/A";
          const options = {
            year: "numeric",
            month: "short",
            day: "numeric",
          };
          if (isRepoUpdate) {
            return new Date(dateString).toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' });
          }
          return new Date(dateString).toLocaleDateString("en-US", options);
        }

        // --- Initial Load ---
        displaySearchHistory();
      });