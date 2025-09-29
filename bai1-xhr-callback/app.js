// =========== HÀM DÙNG CHUNG ===========
function sendRequest(method, url, callback) {
  const xhr = new XMLHttpRequest();
  xhr.open(method, url, true);

  xhr.onload = function () {
    if (xhr.status >= 200 && xhr.status < 400) {
      try {
        const result = JSON.parse(xhr.responseText);
        callback(null, result);
      } catch (error) {
        callback("Lỗi xử lý dữ liệu JSON", null);
      }
    } else if (xhr.status >= 400 && xhr.status < 500) {
      callback(`Lỗi phía client ${xhr.status}: ${xhr.statusText} `, null);
    } else if (xhr.status >= 500 && xhr.status < 600) {
      callback(`Lỗi server ${xhr.status}: ${xhr.statusText}`, null);
    } else {
      callback(`Request thất bại: mã lỗi ${xhr.status}`, null);
    }
  };
  xhr.onerror = function () {
    callback("Không thể kết nối đến server", null);
  };
  xhr.send();
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

searchUserBtn.addEventListener("click", (e) => {
  e.preventDefault();
  const userId = userIdInput.value.trim();
  if (!userId) {
    showError("Vui lòng nhập user ID!", userError, userLoading, userProfile);
    return;
  }
  showLoading(userLoading, userError, userProfile);
  sendRequest(
    "GET",
    `https://jsonplaceholder.typicode.com/users/${userId}`,
    (error, user) => {
      if (error) {
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
      }

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
    }
  );
});

// =============== POSTS VÀ COMMENTS ===============
const postsList = document.querySelector("#posts-container");
const postsLoading = document.querySelector("#posts-loading");
const postsError = document.querySelector("#posts-error");

function getPosts() {
  showLoading(postsLoading, postsError, postsList);
  let posts;
  let users;

  function tryRender() {
    if (posts && users) {
      showContent(postsList, postsLoading, postsError);
      const userMap = {};
      users.forEach((u) => (userMap[u.id] = u.name));

      postsList.innerHTML = posts
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
        </div>
        `
        )
        .join("");
    }
  }
  // Lấy danh sách bài posts
  sendRequest(
    "GET",
    "https://jsonplaceholder.typicode.com/posts?_limit=5",
    (error, data) => {
      if (error) {
        showError(error, postsError, postsLoading, postsList);
        return;
      }
      posts = data;
      tryRender();
    }
  );
  // Lấy danh sách users
  sendRequest(
    "GET",
    "https://jsonplaceholder.typicode.com/users",
    (error, data) => {
      if (error) {
        showError(error, postsError, postsLoading, postsList);
        return;
      }
      users = data;
      tryRender();
    }
  );
}
getPosts();

postsList.addEventListener("click", (e) => {
  const button = e.target.closest(".show-comments-btn");
  if (!button) return;
  const postItem = e.target.closest(".post-item");
  if (!postItem) return;
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
         <div class="comments-list"></div>
    `;

  const commentsLoading = commentsContainer.querySelector("#comments-loading");
  const commentsError = commentsContainer.querySelector("#comments-error");
  const commentsList = commentsContainer.querySelector(".comments-list");
  showLoading(commentsLoading, commentsError, commentsList);
  sendRequest(
    "GET",
    `https://jsonplaceholder.typicode.com/posts/${postId}/comments`,
    (error, comments) => {
      if (error) {
        showError(error, commentsError, commentsLoading, commentsList);
        return;
      }

      if (!comments || comments.length === 0) {
        showError(
          "Không có comment nào!",
          commentsError,
          commentsLoading,
          commentsList
        );
        return;
      }
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
    }
  );
  button.textContent = "Ẩn comments";
});

// =========== TODO LIST ===========
const loadTodosBtn = document.querySelector("#load-todos-btn");
const todoList = document.querySelector("#todo-list");
const todosError = document.querySelector("#todos-error");
const todosLoading = document.querySelector("#todos-loading");

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
  sendRequest(
    "GET",
    `https://jsonplaceholder.typicode.com/users/${userId}/todos`,
    (error, data) => {
      if (error) {
        showError(error, todosError, todosLoading, todoList);
        return;
      }
      todos = data;
      renderTodos();
      showContent(todoList, todosLoading, todosError);
    }
  );
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
