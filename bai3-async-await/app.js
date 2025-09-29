// =========== HÀM DÙNG CHUNG ===========
async function sendRequest(method, url) {
  try {
    const response = await fetch(url, { method });
    if (!response.ok) {
      if (response.status >= 400 && response.status < 500) {
        throw `Lỗi phía client ${response.status}: ${
          response.statusText || "Client Error"
        } `;
      } else if (response.status >= 500 && response.status < 600) {
        throw `Lỗi server ${response.status}: ${
          response.statusText || "Server Error"
        }`;
      } else {
        throw `Request thất bại: mã lỗi ${response.status}`;
      }
    }
    try {
      const result = await response.json();
      return result;
    } catch (error) {
      throw "Lỗi xử lý dữ liệu JSON";
    }
  } catch (error) {
    if (typeof error === "string") {
      throw error;
    } else if (
      error.message &&
      (error.message.includes("fetch") || error.message.includes("network"))
    ) {
      throw "Không thể kết nối đến server (Network Error)";
    } else {
      throw error;
    }
  }
}

// Hàm gọi API có retry
async function sendRequestWithRetry(
  method,
  url,
  maxRetries = 1,
  delay = 2000,
  retryInfo
) {
  let attempt = 0;
  const maxAttempts = maxRetries + 1;
  let lastError = null;

  while (attempt < maxAttempts) {
    attempt++;
    if (retryInfo) {
      if (attempt > 1) {
        retryInfo.classList.add("show");
        retryInfo.textContent = `Đang tải lại lần thứ ${attempt - 1}`;
      } else {
        retryInfo.classList.remove("show");
        retryInfo.textContent = "";
      }
    }
    try {
      const result = await sendRequest(method, url);
      //   Xóa retry và trả về kết quả
      if (retryInfo) {
        retryInfo.classList.remove("show");
        retryInfo.textContent = "";
      }
      return result;
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts) {
        if (retryInfo) {
          retryInfo.classList.remove("show");
          retryInfo.textContent = "";
        }
        throw lastError;
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
// Hàm dùng chung hiển thị loading/error/content
function showLoading(loading, error, content) {
  loading.classList.add("show");
  error.classList.remove("show");
  content.classList.remove("show");
}
function showError(message, error, loading, content) {
  error.classList.add("show");
  loading.classList.remove("show");
  content.classList.remove("show");
  const errorText = error.querySelector(".error-text");
  if (errorText) {
    errorText.textContent =
      typeof message === "string"
        ? message
        : message.message || "Lỗi không xác định";
  }
}
function showContent(content, loading, error) {
  content.classList.add("show");
  error.classList.remove("show");
  loading.classList.remove("show");
}
// ============= USER PROFILE ==============
const searchUserBtn = document.querySelector("#search-user-btn");
const userIdInput = document.querySelector(".user-id-input");
const userInfo = document.querySelector(".user-info");
const userProfile = document.querySelector("#user-profile-card");
const userLoading = document.querySelector("#user-loading");
const userError = document.querySelector("#user-error");
const userRetryInfo = document.querySelector("#user-retry-info");

searchUserBtn.addEventListener("click", async (e) => {
  e.preventDefault();
  const userId = userIdInput.value.trim();
  if (!userId) {
    showError("Vui lòng nhập user ID!", userError, userLoading, userProfile);
    return;
  }
  showLoading(userLoading, userError, userProfile);

  try {
    const user = await sendRequestWithRetry(
      "GET",
      `https://jsonplaceholder.typicode.com/users/${userId}`,
      1,
      2000,
      userRetryInfo
    );
    showContent(userProfile, userLoading, userError);
    userInfo.innerHTML = `  <h4 id="user-name" class="user-name">${user.name}</h4>
      <div class="user-details" id="user-details">
        <div class="user-detail-item">
        <span class="user-detail-label">Email:</span><span id="user-email">${user.email}</span>
        </div>
        <div class="user-detail-item">
        <span class="user-detail-label">Phone:</span><span id="user-phone">${user.phone}</span>
        </div>
        <div class="user-detail-item">
        <span class="user-detail-label">Website:</span><span id="user-website">${user.website}</span>
        </div>
        <div class="user-detail-item">
        <span class="user-detail-label">Company:</span><span id="user-company">${user.company.name}</span>
        </div>
        <div class="user-detail-item">
        <span class="user-detail-label">Address</span><span id="user-address">${user.address.street}, ${user.address.city}</span>
        </div>
      </div>`;
    userIdInput.value = "";
  } catch (error) {
    let displayError = String(error);
    if (displayError.includes("404")) {
      displayError = "User ID không tồn tại!";
    } else if (
      displayError.includes("Network Error") ||
      displayError.includes("Không thể kết nối")
    ) {
      displayError =
        "Không thể kết nối đến server. Kiểm tra URL hoặc kết nối mạng.";
    } else if (
      displayError.includes("Lỗi phía client") ||
      displayError.includes("Lỗi server") ||
      displayError.includes("Lỗi xử lý dữ liệu JSON")
    ) {
      displayError = "Lỗi API hoặc dữ liệu.";
    }
    showError(displayError, userError, userLoading, userProfile);
  }
});

// =============== POSTS VÀ COMMENTS ===============
const postsList = document.querySelector("#posts-container");
const postsLoading = document.querySelector("#posts-loading");
const postsError = document.querySelector("#posts-error");
const loadMorePostsBtn = document.querySelector("#load-more-posts-btn");
const postsRetryInfo = document.querySelector("#posts-retry-info");

let postStart = 0;
const postLimit = 5;

async function getPosts() {
  showLoading(postsLoading, postsError, postsList);
  try {
    const [posts, users] = await Promise.all([
      sendRequestWithRetry(
        "GET",
        `https://jsonplaceholder.typicode.com/posts?_start=${postStart}&_limit=${postLimit}`,
        1,
        2000,
        postsRetryInfo
      ),
      sendRequestWithRetry(
        "GET",
        "https://jsonplaceholder.typicode.com/users",
        1,
        2000,
        postsRetryInfo
      ),
    ]);
    if (!posts || posts.length === 0) {
      throw "Không còn bài post nào!";
    }

    showContent(postsList, postsLoading, postsError);
    const userMap = {};
    users.forEach((u) => (userMap[u.id] = u.name));
    postsList.innerHTML += posts
      .map(
        (post) => `
            <div class="post-item" data-post-id="${post.id}">
            <h4 class="post-title">${post.title}</h4>
            <p class="post-body">${post.body}</p>
            <p class="post-author">Tác giả: <span class="author-name">
              ${userMap[post.userId] || "Không rõ"}
            </span></p>
            <button class="show-comments-btn" data-post-id="${
              post.id
            }">Xem comments</button>
            <div class="comments-container" data-post-id="${post.id}">
            </div>
            </div>`
      )
      .join("");

    postStart += postLimit;
  } catch (error) {
    showError(error, postsError, postsLoading, postsList);
  }
}
getPosts();

loadMorePostsBtn.addEventListener("click", (e) => {
  e.preventDefault();
  getPosts();
});

postsList.addEventListener("click", async (e) => {
  const button = e.target.closest(".show-comments-btn");
  if (!button) return;

  const postItem = e.target.closest(".post-item");
  const postId = button.dataset.postId;
  const commentsContainer = postItem.querySelector(".comments-container");
  // Logic ẩn/hiện comments
  if (commentsContainer.classList.contains("show")) {
    commentsContainer.classList.remove("show");
    commentsContainer.innerHTML = "";
    button.textContent = "Xem comments";
    return;
  }
  // Logic tải comments
  commentsContainer.classList.add("show");
  commentsContainer.innerHTML = `
    <div id="comments-loading" class="loading-spinner">
        <p>🔄 Đang tải thông tin comments...</p>
       </div>
        <div id="comments-error" class="error-message">
          <p id="comments-error-text" class="error-text">Có lỗi xảy ra khi tải comments</p>
      </div>
          <div id="comments-retry-info" class="retry-info"></div>
         <div class="comments-list"></div>
    `;

  const commentsLoading = commentsContainer.querySelector("#comments-loading");
  const commentsError = commentsContainer.querySelector("#comments-error");
  const commentsList = commentsContainer.querySelector(".comments-list");
  const commentsRetryInfo = commentsContainer.querySelector(
    "#comments-retry-info"
  );

  showLoading(commentsLoading, commentsError, commentsList);
  button.textContent = "Ẩn comments";
  try {
    const comments = await sendRequestWithRetry(
      "GET",
      `https://jsonplaceholder.typicode.com/posts/${postId}/comments`,
      1,
      2000,
      commentsRetryInfo
    );
    if (!comments || comments.length === 0) throw "Không có comment nào!";

    commentsList.innerHTML = comments
      .map(
        (comment) => ` <div class="comment-item">
      <div class="comment-author">${comment.name}</div>
      <div class="comment-email">${comment.email}</div>
      <div class="comment-body">${comment.body}</div>
    </div>`
      )
      .join("");

    showContent(commentsList, commentsLoading, commentsError);
  } catch (error) {
    showError(error, commentsError, commentsLoading, commentsList);
    button.textContent = "Xem comments";
  }
});

// =========== TODO LIST ===========
const loadTodosBtn = document.querySelector("#load-todos-btn");
const todoList = document.querySelector("#todo-list");
const todosError = document.querySelector("#todos-error");
const todosLoading = document.querySelector("#todos-loading");
const todosRetryInfo = document.querySelector("#todos-retry-info");

const totalTodos = document.querySelector("#total-todos");
const completedTodos = document.querySelector("#completed-todos");
const incompleteTodos = document.querySelector("#incomplete-todos");

const filterBtn = document.querySelectorAll(".filter-btn");
const todoTemplate = document.querySelector("#todo-template");

let todos = [];
let currentFilter = "all";
let currentUserId = 1;

async function getTodos(userId) {
  showLoading(todosLoading, todosError, todoList);
  try {
    const data = await sendRequestWithRetry(
      "GET",
      `https://jsonplaceholder.typicode.com/users/${userId}/todos`,
      1,
      2000,
      todosRetryInfo
    );
    todos = data;
    renderTodos();
    showContent(todoList, todosLoading, todosError);
  } catch (error) {
    showError(error, todosError, todosLoading, todoList);
    resetTodoStat();
  }
}

function renderTodos() {
  todoList.innerHTML = "";
  let filtered = todos;
  if (currentFilter === "completed") {
    filtered = todos.filter((t) => t.completed);
  } else if (currentFilter === "incomplete") {
    filtered = todos.filter((t) => !t.completed);
  }
  filtered.forEach((todo) => {
    const todoTask = todoTemplate.content.cloneNode(true);
    const todoItem = todoTask.querySelector(".todo-item");
    todoItem.dataset.todoId = todo.id;
    todoItem.dataset.completed = todo.completed;

    const todoText = todoItem.querySelector(".todo-text");
    todoText.textContent = todo.title;

    if (todo.completed) {
      todoItem.classList.add("completed");
    } else {
      todoItem.classList.add("incomplete");
    }
    todoList.appendChild(todoTask);
  });

  // Cập nhật số liệu task hoàn thành/chưa hoàn thành
  const total = todos.length;
  const completedCount = todos.filter((t) => t.completed).length;
  const incompleteCount = total - completedCount;
  totalTodos.textContent = total;
  completedTodos.textContent = completedCount;
  incompleteTodos.textContent = incompleteCount;
}

// Lắng nghe filter button
filterBtn.forEach((btn) => {
  btn.addEventListener("click", () => {
    currentFilter = btn.dataset.filter;
    filterBtn.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    renderTodos();
  });
});

// Reset lại todoStat
function resetTodoStat() {
  todoList.innerHTML = "";
  totalTodos.textContent = 0;
  completedTodos.textContent = 0;
  incompleteTodos.textContent = 0;
}

// Lắng nghe sự kiện click nút loadTodo
loadTodosBtn.addEventListener("click", (e) => {
  e.preventDefault();
  const input = document.querySelector("#todo-user-id-input");
  const userId = Number(input.value.trim());
  if (!userId) {
    showError("Vui lòng nhập user ID!", todosError, todosLoading, todoList);
    resetTodoStat();
    return;
  } else if (userId < 1 || userId > 10) {
    showError("User ID không tồn tại!", todosError, todosLoading, todoList);
    resetTodoStat();
    return;
  } else {
    currentUserId = userId;
    input.value = "";
    getTodos(currentUserId);
  }
});
