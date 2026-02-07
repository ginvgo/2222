const { createApp, ref, onMounted, watch } = Vue;

createApp({
    setup() {
        const siteTitle = ref('Project Portal');
        const projects = ref([]);
        const loading = ref(false);
        const searchQuery = ref('');
        const pagination = ref({ page: 1, totalPages: 1 });
        
        // Modal State
        const showPasswordModal = ref(false);
        const selectedProject = ref(null);
        const passwordInput = ref('');
        const showPwd = ref(false);
        const rememberMe = ref(false);
        const verifying = ref(false);
        const errorMsg = ref('');
        
        // Info Modal
        const showInfoModal = ref(false);
        const infoModalTitle = ref('');
        const infoModalContent = ref('');

        // --- Fetch Data ---
        const fetchProjects = async (page = 1) => {
            loading.value = true;
            try {
                const q = searchQuery.value ? `&q=${encodeURIComponent(searchQuery.value)}` : '';
                const res = await fetch(`/api/public/list?page=${page}${q}`);
                if (res.ok) {
                    const data = await res.json();
                    projects.value = data.data;
                    pagination.value = data.pagination;
                    
                    // Update site title if config exists (backend doesn't return it in list, maybe separate call or embedded)
                    // For now use default or if backend sent it.
                }
            } catch (e) {
                console.error(e);
            } finally {
                loading.value = false;
            }
        };
        
        // Debounce Search
        let timeout;
        const debouncedSearch = () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                fetchProjects(1);
            }, 300);
        };
        
        const clearSearch = () => {
            searchQuery.value = '';
            fetchProjects(1);
        };
        
        const changePage = (p) => {
            if (p < 1 || p > pagination.value.totalPages) return;
            fetchProjects(p);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };

        // --- Actions ---
        const handleVisit = (project) => {
            if (project.is_encrypted) {
                // Check if we already have a token in localStorage or cookie?
                // Actually verify logic:
                // If we have a stored token for this project, try to use it?
                // But tokens are short lived or session based.
                // Let's just prompt unless we have a "remembered" state.
                // Simplified: Always prompt if client-side check fails, but maybe check local storage for existing token.
                const storedToken = localStorage.getItem(`token_${project.id}`);
                if (storedToken) {
                    // Try to redirect with token
                    window.location.href = `/${project.path}/?token=${storedToken}`;
                    return;
                }
                
                selectedProject.value = project;
                passwordInput.value = '';
                errorMsg.value = '';
                showPasswordModal.value = true;
            } else {
                window.location.href = `/${project.path}/`;
            }
        };
        
        const verifyPassword = async () => {
            if (!passwordInput.value) return;
            verifying.value = true;
            errorMsg.value = '';
            
            try {
                const res = await fetch('/api/public/verify', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        projectId: selectedProject.value.id,
                        password: passwordInput.value
                    })
                });
                
                const data = await res.json();
                
                if (res.ok && data.success) {
                    // Success
                    const token = data.token;
                    if (rememberMe.value) {
                        localStorage.setItem(`token_${selectedProject.value.id}`, token);
                    }
                    
                    // Redirect
                    window.location.href = `/${selectedProject.value.path}/?token=${token}`;
                    showPasswordModal.value = false;
                } else {
                    errorMsg.value = '密码错误，请重试';
                }
            } catch (e) {
                errorMsg.value = '验证出错，请稍后重试';
            } finally {
                verifying.value = false;
            }
        };
        
        const closePasswordModal = () => {
            showPasswordModal.value = false;
            selectedProject.value = null;
        };

        // --- Extra Buttons ---
        const parseButtons = (buttonsJson) => {
            if (!buttonsJson) return [];
            try {
                return typeof buttonsJson === 'string' ? JSON.parse(buttonsJson) : buttonsJson;
            } catch (e) { return []; }
        };
        
        const handleExtraButton = (btn) => {
            if (btn.type === 'link') {
                window.open(btn.content, '_blank');
            } else if (btn.type === 'modal') {
                infoModalTitle.value = btn.label;
                // Parse markdown if needed, here we assume simple HTML or text
                infoModalContent.value = marked.parse(btn.content); 
                showInfoModal.value = true;
            }
        };
        
        const showKnowledgeModal = (project) => {
             infoModalTitle.value = '获取密码 / 知识星球';
             // Default content or from project?
             // User said "Knowledge Planet button (with modal prompt copy)".
             // I'll put a placeholder.
             infoModalContent.value = `
                <div class="text-center">
                    <p class="mb-4">该项目为加密内容，请关注知识星球获取密码。</p>
                    <a href="#" class="inline-block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">跳转到知识星球</a>
                </div>
             `;
             showInfoModal.value = true;
        };

        // --- Security (Anti-Inspection) ---
        onMounted(() => {
            fetchProjects();
            
            // Fetch global config for title
             fetch('/api/admin/config').then(r => r.json()).then(config => {
                 if (config.site_title) {
                     siteTitle.value = config.site_title;
                     document.title = config.site_title;
                 }
             }).catch(() => {});

            // Disable Context Menu
            document.addEventListener('contextmenu', event => event.preventDefault());
            
            // Disable F12 / Ctrl+Shift+I
            document.addEventListener('keydown', event => {
                if (event.key === 'F12' || 
                    (event.ctrlKey && event.shiftKey && event.key === 'I') ||
                    (event.metaKey && event.altKey && event.key === 'I')) {
                    event.preventDefault();
                }
            });
        });

        return {
            siteTitle, projects, loading, searchQuery, pagination,
            debouncedSearch, clearSearch, changePage,
            showPasswordModal, selectedProject, passwordInput, showPwd, rememberMe, verifying, errorMsg,
            handleVisit, verifyPassword, closePasswordModal,
            showInfoModal, infoModalTitle, infoModalContent,
            handleExtraButton, showKnowledgeModal, parseButtons
        };
    }
}).mount('#app');
