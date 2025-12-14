let allPosts = [];
let currentPage = 1;
const postsPerPage = 6;

export async function loadBlogPosts() {
  const container = document.getElementById('posts-container');
  if (!container) return;

  try {
    const indexResponse = await fetch('posts/index.json');
    if (!indexResponse.ok) throw new Error('无法获取博客列表');
    const postFileNames = await indexResponse.json();

    allPosts = [];
    for (const fileName of postFileNames) {
      const postResponse = await fetch(`posts/${fileName}`);
      if (postResponse.ok) {
        allPosts.push(await postResponse.text());
      }
    }

    renderPage(1);

  } catch (error) {
    console.error('加载博客失败:', error);
    container.innerHTML = '<p>加载博客时出错，请稍后再试</p>';
  }
}

function renderPage(pageNum) {
  const container = document.getElementById('posts-container');
  const startIndex = (pageNum - 1) * postsPerPage;
  const endIndex = startIndex + postsPerPage;
  const currentPosts = allPosts.slice(startIndex, endIndex);

  container.innerHTML = currentPosts.join('');

  currentPage = pageNum;
  renderPagination();
}

function renderPagination() {
  const paginationContainer = document.getElementById('pagination');
  const totalPages = Math.ceil(allPosts.length / postsPerPage);
  if (totalPages <= 1) {
    paginationContainer.innerHTML = '';
    return;
  }

  paginationContainer.innerHTML = '';

  const prevBtn = document.createElement('span');
  prevBtn.className = `pagination-btn pagination-prev ${currentPage === 1 ? 'disabled' : ''}`;
  prevBtn.textContent = '上一页';
  prevBtn.disabled = currentPage === 1;
  prevBtn.addEventListener('click', () => {
    if (currentPage > 1) renderPage(currentPage - 1);
  });
  paginationContainer.appendChild(prevBtn);

  const visibleRange = 2;
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 || 
      i === totalPages || 
      (i >= currentPage - visibleRange && i <= currentPage + visibleRange)
    ) {
      const btn = document.createElement('span');
      btn.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
      btn.textContent = i;
      btn.addEventListener('click', () => renderPage(i));
      paginationContainer.appendChild(btn);
    } else if (
      (i === currentPage - visibleRange - 1 && currentPage - visibleRange > 2) ||
      (i === currentPage + visibleRange + 1 && currentPage + visibleRange < totalPages - 1)
    ) {
      const ellipsis = document.createElement('span');
      ellipsis.className = 'pagination-ellipsis';
      ellipsis.textContent = '...';
      paginationContainer.appendChild(ellipsis);
    }
  }

  const nextBtn = document.createElement('span');
  nextBtn.className = `pagination-btn pagination-next ${currentPage === totalPages ? 'disabled' : ''}`;
  nextBtn.textContent = '下一页';
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.addEventListener('click', () => {
    if (currentPage < totalPages) renderPage(currentPage + 1);
  });
  paginationContainer.appendChild(nextBtn);
}