let isModalOpen = false;

function showModal({ 
  title = "Thông báo", 
  message = "", 
  actionText = null, 
  onAction = null 
}) {
  const modal = document.getElementById("appModal");
  if (!modal) return;

  if (isModalOpen) return; // tránh mở lặp
  isModalOpen = true;

  document.getElementById("appModalTitle").textContent = title;
  document.getElementById("appModalMessage").textContent = message;

  const actionBtn = document.getElementById("appModalAction");
  actionBtn.onclick = null;

  if (actionText) {
    actionBtn.textContent = actionText;
    actionBtn.classList.remove("hidden");
    actionBtn.onclick = () => {
      if (onAction) onAction();
      closeModal();
    };
  } else {
    actionBtn.classList.add("hidden");
  }

  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeModal() {
  const modal = document.getElementById("appModal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  isModalOpen = false; // reset flag
}

// Đóng bằng nút & overlay
document.addEventListener("click", (e) => {
  if (e.target.id === "appModalClose") closeModal();
  const modal = document.getElementById("appModal");
  if (modal && e.target === modal) closeModal();
});

// Đóng bằng phím Escape
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

// Tiện ích nhanh
function alertModal(message, title = "Thông báo") {
  showModal({ title, message });
}

function confirmModal(message, onConfirm, title = "Xác nhận") {
  showModal({
    title,
    message,
    actionText: "Đồng ý",
    onAction: onConfirm
  });
}
