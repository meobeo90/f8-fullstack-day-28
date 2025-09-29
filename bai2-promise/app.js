// =========== HÀM DÙNG CHUNG ===========
function sendRequest(method, url) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true);

    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 400) {
        try {
          const result = JSON.parse(xhr.responseText);
          resolve(result);
        } catch (error) {
          reject("Lỗi xử lý dữ liệu JSON");
        }
      } else if (xhr.status >= 400 && xhr.status < 500) {
        reject(`Lỗi phía client ${xhr.status}: ${xhr.statusText} `);
      } else if (xhr.status >= 500 && xhr.status < 600) {
        reject(`Lỗi server ${xhr.status}: ${xhr.statusText}`);
      } else {
        reject(`Request thất bại: mã lỗi ${xhr.status}`);
      }
    };
    xhr.onerror = function () {
      reject("Không thể kết nối đến server");
    };
    xhr.send();
  });
}
// Hàm gọi API có retry
function sendRequestWithRetry(
  method,
  url,
  maxRetries = 1,
  delay = 2000,
  retryInfo
) {
  let attempt = 0;

  function attemptRequest() {
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
    return sendRequest(method, url)
      .then((result) => {
        if (retryInfo) {
          retryInfo.classList.remove("show");
          retryInfo.textContent = "";
        }
        return result;
      })
      .catch((error) => {
        if (attempt <= maxRetries + 1) {
          return new Promise((resolve) => setTimeout(resolve, delay)).then(
            attemptRequest
          );
        } else {
          if (retryInfo) {
            retryInfo.classList.remove("show");
            retryInfo.textContent = "";
          }
          throw error;
        }
      });
  }
  return attemptRequest();
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
    errorText.textContent = message;
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

searchUserBtn.addEventListener("click", (e) => {
  e.preventDefault();
  const userId = userIdInput.value.trim();
  if (!userId) {
    showError("Vui lòng nhập user ID!", userError, userLoading, userProfile);
    return;
  }
  showLoading(userLoading, userError, userProfile);
  sendRequestWithRetry(
    "GET",
    `https://jsonplaceholder.typicode.com/users/${userId}`,
    1,
    2000,
    userRetryInfo
  )
    .then((user) => {
      showContent(userProfile, userLoading, userError);
      userInfo.innerHTML = `
      <h4 id="user-name" class="user-name">${user.name}</h4>
              <div class="user-details" id="user-details">
                <div class="user-detail-item">
                  <span class="user-detail-label">Email:</span>
                  <span id="user-email">${user.email}</span>
                </div>
                <div class="user-detail-item">
                  <span class="user-detail-label">Phone:</span>
                  <span id="user-phone">${user.phone}</span>
                </div>
                <div class="user-detail-item">
                  <span class="user-detail-label">Website:</span>
                  <span id="user-website">${user.website}</span>
                </div>
                <div class="user-detail-item">
                  <span class="user-detail-label">Company:</span>
                  <span id="user-company">${user.company.name}</span>
                </div>
                <div class="user-detail-item">
                  <span class="user-detail-label">Address</span>
                  <span id="user-address">${user.address.street}, ${user.address.city}</span>
                </div>
              </div>`;
      userIdInput.value = "";
    })
    .catch((error) => {
      if (error.includes("404")) {
        showError(
          "User ID không tồn tại!",
          userError,
          userLoading,
          userProfile
        );
      } else {
        showError(error, userError, userLoading, userProfile);
      }
      return;
    });
});

// =============== POSTS VÀ COMMENTS ===============
const postsList = document.querySelector("#posts-container");
const postsLoading = document.querySelector("#posts-loading");
const postsError = document.querySelector("#posts-error");
const loadMorePostsBtn = document.querySelector("#load-more-posts-btn");
const postsRetryInfo = document.querySelector("#posts-retry-info");

let postStart = 0;
const postLimit = 5;

function getPosts() {
  showLoading(postsLoading, postsError, postsList);
  Promise.all([
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
  ])
    .then(([posts, users]) => {
      if (!posts || posts.length === 0) {
        showError(
          "Không còn bài post nào!",
          postsError,
          postsLoading,
          postsList
        );
        return;
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
    })
    .catch((error) => {
      showError(error, postsError, postsLoading, postsList);
    });
}
getPosts();

loadMorePostsBtn.addEventListener("click", (e) => {
  e.preventDefault();
  getPosts();
});

postsList.addEventListener("click", (e) => {
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
  const commentsRetryInfo = document.querySelector("#comments-retry-info");

  showLoading(commentsLoading, commentsError, commentsList);

  sendRequestWithRetry(
    "GET",
    `https://jsonplaceholder.typicode.com/posts/${postId}/comments`,
    1,
    2000,
    commentsRetryInfo
  )
    .then((comments) => {
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
    })
    .catch((error) => {
      showError(error, commentsError, commentsLoading, commentsList);
      return;
    });
  button.textContent = "Ẩn comments";
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

function getTodos(userId) {
  showLoading(todosLoading, todosError, todoList);
  sendRequestWithRetry(
    "GET",
    `https://jsonplaceholder.typicode.com/users/${userId}/todos`,
    1,
    2000,
    todosRetryInfo
  )
    .then((data) => {
      todos = data;
      renderTodos();
      showContent(todoList, todosLoading, todosError);
    })
    .catch((error) => {
      showError(error, todosError, todosLoading, todoList);
      resetTodoStat();
    });
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
