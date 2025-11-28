document.addEventListener("DOMContentLoaded", () => {
    const toastContainer = document.createElement("div");
    toastContainer.className = "toast-container position-fixed bottom-0 end-0 p-3";
    document.body.appendChild(toastContainer);

    function showToast(message, type="info") {
        const toast = document.createElement("div");
        toast.className = `toast align-items-center text-bg-${type} border-0 show`;
        toast.role = "alert";
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>`;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 5000);
    }

    const refreshStatus = () => {
        fetch("/api/devices")
            .then(r => r.json())
            .then(devices => {
                devices.forEach(dev => {
                    const card = document.querySelector(`#card-${dev.name}`);
                    if (!card) return;

                    const statusEl = card.querySelector(".device-status");
                    const btn = card.querySelector(".action-btn");
                    const tsEl = card.querySelector(".ts-ip");

                    // Show stored Tailscale IP only when online
                    if (dev.online && dev.tailscale_ip) {
                        tsEl.innerHTML = `Tailscale IP: ${dev.tailscale_ip}`;
                    } else {
                        tsEl.innerHTML = "";
                    }

                    if (dev.online) {
                        statusEl.innerHTML = `<i class="fa-solid fa-circle-check"></i> ONLINE`;
                        statusEl.className = "device-status status-badge status-online fw-bold text-center";
                        if (btn) {
                            btn.disabled = true;
                            btn.dataset.action = "start";
                            btn.className = "btn btn-secondary w-100";
                            btn.innerHTML = `<i class="fa-solid fa-check-circle"></i> Online`;
                        }
                    } else {
                        statusEl.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> OFFLINE`;
                        statusEl.className = "device-status status-badge status-offline fw-bold text-center";
                        if (btn) {
                            btn.dataset.action = "start";
                            btn.disabled = false;
                            btn.className = "btn btn-primary w-100 action-btn";
                            btn.innerHTML = `<i class="fa-solid fa-play"></i> Power On`;
                        }
                    }
                });
            });
    };

    document.addEventListener("click", e => {
        if (e.target.classList.contains("action-btn")) {
            const device = e.target.dataset.device;
            const action = e.target.dataset.action;

            if (action === "start") {
                const card = document.querySelector(`#card-${device}`);
                const tsEl = card ? card.querySelector(".ts-ip") : null;

                e.target.disabled = true;
                e.target.classList.add("pulse");
                e.target.innerHTML = "Starting... Please wait 3-5 minutes";
                showToast("NAS is starting. Please wait...", "warning");

                let timeLeft = 420;
                const countdownEl = document.querySelector(`#countdown-${device}`);
                if (countdownEl) {
                    countdownEl.innerHTML = `Time left: ${Math.floor(timeLeft / 60)}m ${timeLeft % 60}s`;
                }

                const countdownInterval = setInterval(() => {
                    timeLeft--;
                    if (countdownEl) {
                        countdownEl.innerHTML = `Time left: ${Math.floor(timeLeft / 60)}m ${timeLeft % 60}s`;
                    }
                    if (timeLeft <= 0) {
                        clearInterval(countdownInterval);
                    }
                }, 1000);

                fetch("/start/nas", { method: "GET" })
                    .then(r => r.json())
                    .then(data => {
                        if (data.success && data.tailscale_ip && tsEl) {
                            tsEl.innerHTML = `Tailscale IP: ${data.tailscale_ip}`;
                        }
                    })
                    .catch(() => {
                        // ignore; polling will still handle status
                    })
                    .finally(() => {
                        let attempts = 0;
                        const interval = setInterval(() => {
                            attempts++;
                            fetch("/api/devices")
                                .then(r => r.json())
                                .then(devs => {
                                    let dev = devs.find(d => d.name === device);
                                    if (dev && dev.online) {
                                        clearInterval(interval);
                                        clearInterval(countdownInterval);
                                        e.target.classList.remove("pulse");
                                        if (countdownEl) countdownEl.innerHTML = "";
                                        showToast("NAS is now ONLINE!", "success");
                                        refreshStatus();
                                    } else if (attempts > 84) {
                                        clearInterval(interval);
                                        clearInterval(countdownInterval);
                                        e.target.disabled = false;
                                        e.target.classList.remove("pulse");
                                        e.target.innerHTML = `<i class="fa-solid fa-play"></i> Power On`;
                                        if (countdownEl) countdownEl.innerHTML = "Startup timed out.";
                                        showToast("Startup timed out. Try again.", "danger");
                                    }
                                });
                        }, 5000);
                    });
                return;
            }
        }
    });

    setInterval(refreshStatus, 300000); // every 5 minutes
    refreshStatus();
});
