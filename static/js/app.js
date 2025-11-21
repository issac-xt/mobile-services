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

                    fetch(`/list`)
                        .then(r => r.json())
                        .then(list => {
                            let ts = list.devices || list;
                            let match = ts.find(d => d.hostname === dev.ts_name);
                            if (match) {
                                tsEl.innerHTML = `Tailscale IP: ${match.addresses[0]}`;
                            } else {
                                tsEl.innerHTML = "";
                            }
                        });

                    if (dev.online) {
                        statusEl.innerHTML = `<i class="fa-solid fa-circle-check"></i> ONLINE`;
                        statusEl.className = "device-status status-badge status-online fw-bold text-center";
                        btn.disabled = false;
                        btn.dataset.action = "off";
                        btn.className = "btn btn-danger w-100 action-btn";
                        btn.innerHTML = `<i class="fa-solid fa-power-off"></i> Shutdown`;
                    } else {
                        statusEl.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> OFFLINE`;
                        statusEl.className = "device-status status-badge status-offline fw-bold text-center";
                        btn.dataset.action = "start";
                        btn.disabled = false;
                        btn.className = "btn btn-primary w-100 action-btn";
                        btn.innerHTML = `<i class="fa-solid fa-play"></i> Power On`;
                    }
                });
            });
    };

    document.addEventListener("click", e => {
        if (e.target.classList.contains("action-btn")) {
            const device = e.target.dataset.device;
            const action = e.target.dataset.action;

            if (action === "off") {
                const btn = e.target;
                const device = btn.dataset.device;

                const modalEl = document.getElementById("shutdownModal");
                const modalText = document.getElementById("shutdown-modal-text");
                const confirmBtn = document.getElementById("shutdown-confirm-btn");

                modalText.innerHTML = "Are you sure you want to shut down the NAS?";
                const modal = new bootstrap.Modal(modalEl);
                modal.show();

                confirmBtn.onclick = () => {
                    modal.hide();

                    btn.disabled = true;
                    btn.classList.add("pulse");
                    btn.innerHTML = "Shutting down...";

                    showToast("Shutdown command sent. Monitoring NAS status...", "warning");

                    fetch(`/api/nas/active`)
                        .then(r => r.json())
                        .then(active => {
                            if (active.active) {
                                btn.disabled = false;
                                btn.classList.remove("pulse");
                                btn.innerHTML = `<i class="fa-solid fa-power-off"></i> Shutdown`;
                                showToast("NAS is currently in use by: " + active.users.join(", "), "danger");
                                return;
                            }

                            fetch(`/off/${device}`)
                                .then(r => r.json())
                                .then(data => {
                                    if (data.status !== "shutdown_sent") {
                                        btn.disabled = false;
                                        btn.classList.remove("pulse");
                                        btn.innerHTML = `<i class="fa-solid fa-power-off"></i> Shutdown`;
                                        const msg = data.message || "Unknown error";
                                        showToast("Shutdown failed: " + msg, "danger");
                                        return;
                                    }

                                    let attempts = 0;
                                    const maxAttempts = 12;
                                    const countdownEl = document.querySelector(`#countdown-${device}`);
                                    let waitLeft = maxAttempts * 5;

                                    const countdownTimer = setInterval(() => {
                                        waitLeft--;
                                        if (waitLeft >= 0 && countdownEl) {
                                            countdownEl.innerHTML = `Waiting for shutdown: ${Math.floor(waitLeft/60)}m ${waitLeft%60}s`;
                                        }
                                    }, 1000);

                                    const pollInterval = setInterval(() => {
                                        attempts++;
                                        fetch("/api/devices")
                                            .then(r => r.json())
                                            .then(devs => {
                                                let d = devs.find(x => x.name === device);
                                                if (!d || !d.online) {
                                                    clearInterval(pollInterval);
                                                    clearInterval(countdownTimer);
                                                    btn.disabled = false;
                                                    btn.classList.remove("pulse");
                                                    if (countdownEl) countdownEl.innerHTML = "NAS is OFF.";
                                                    showToast("NAS is now OFF.", "success");
                                                    refreshStatus();
                                                } else if (attempts >= maxAttempts) {
                                                    clearInterval(pollInterval);
                                                    clearInterval(countdownTimer);
                                                    btn.disabled = false;
                                                    btn.classList.remove("pulse");
                                                    if (countdownEl) countdownEl.innerHTML = "Shutdown may not have completed.";
                                                    showToast("NAS still reachable. Shutdown may not have completed.", "danger");
                                                }
                                            });
                                    }, 5000);
                                })
                                .catch(err => {
                                    btn.disabled = false;
                                    btn.classList.remove("pulse");
                                    btn.innerHTML = `<i class="fa-solid fa-power-off"></i> Shutdown`;
                                    showToast("Shutdown error: " + err, "danger");
                                });
                        });
                };

                return;
            }

            if (action === "start") {
                e.target.disabled = true;
                e.target.classList.add("pulse");
                e.target.innerHTML = "Starting... Please wait 3-5 minutes";
                showToast("NAS is starting. Please wait...", "warning");

                let timeLeft = 420;
                const countdownEl = document.querySelector(`#countdown-${device}`);
                countdownEl.innerHTML = `Time left: ${Math.floor(timeLeft/60)}m ${timeLeft%60}s`;

                const countdownInterval = setInterval(()=>{
                    timeLeft--;
                    countdownEl.innerHTML = `Time left: ${Math.floor(timeLeft/60)}m ${timeLeft%60}s`;
                    if(timeLeft <= 0){ clearInterval(countdownInterval); }
                },1000);

                fetch(`/start/${device}`).then(() => {
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
                                    countdownEl.innerHTML = "";
                                    showToast("NAS is now ONLINE!", "success");
                                    refreshStatus();
                                } else if (attempts > 84) {
                                    clearInterval(interval);
                                    clearInterval(countdownInterval);
                                    e.target.disabled = false;
                                    e.target.classList.remove("pulse");
                                    e.target.innerHTML = `<i class="fa-solid fa-play"></i> Power On`;
                                    countdownEl.innerHTML = "Startup timed out.";
                                    showToast("Startup timed out. Try again.", "danger");
                                }
                            });
                    }, 5000);
                });
                return;
            }

            fetch(`/${action}/${device}`)
                .then(r => r.json())
                .then(() => {
                    showToast(`${device.toUpperCase()} → ${action.toUpperCase()} sent`, "info");
                    refreshStatus();
                });
        }
    });

    setInterval(refreshStatus, 5000);
    refreshStatus();
});
