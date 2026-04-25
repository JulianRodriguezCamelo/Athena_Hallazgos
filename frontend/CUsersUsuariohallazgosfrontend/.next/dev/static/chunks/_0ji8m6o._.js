(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/lib/api.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "actividadesApi",
    ()=>actividadesApi,
    "authApi",
    ()=>authApi,
    "dashboardApi",
    ()=>dashboardApi,
    "directivoApi",
    ()=>directivoApi,
    "gestorApi",
    ()=>gestorApi,
    "hallazgosApi",
    ()=>hallazgosApi,
    "notificacionesApi",
    ()=>notificacionesApi,
    "uploadsApi",
    ()=>uploadsApi,
    "usersApi",
    ()=>usersApi
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
const API_URL = ("TURBOPACK compile-time value", "http://127.0.0.1:5000") || 'http://localhost:5000';
function getToken() {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    return localStorage.getItem('access_token');
}
function handleUnauthorized() {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    window.location.href = '/login';
}
async function request(path, options = {}) {
    const { method = 'GET', body, params, isFormData } = options;
    let url = `${API_URL}${path}`;
    if (params) {
        const query = Object.entries(params).filter(([, v])=>v !== undefined && v !== null && v !== '').map(([k, v])=>`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
        if (query) url += `?${query}`;
    }
    const headers = {};
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!isFormData) headers['Content-Type'] = 'application/json';
    const res = await fetch(url, {
        method,
        headers,
        body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined
    });
    if (res.status === 401) {
        handleUnauthorized();
        throw new Error('Unauthorized');
    }
    if (!res.ok) {
        let errorData = {};
        try {
            errorData = await res.json();
        } catch  {}
        const err = Object.assign(new Error(errorData.error ?? `HTTP ${res.status}`), {
            response: {
                status: res.status,
                data: errorData
            }
        });
        throw err;
    }
    const data = res.status === 204 ? {} : await res.json();
    return {
        data
    };
}
const authApi = {
    login: (email, password)=>request('/api/auth/login', {
            method: 'POST',
            body: {
                email,
                password
            }
        }),
    me: ()=>request('/api/auth/me'),
    logout: ()=>request('/api/auth/logout', {
            method: 'POST'
        })
};
const dashboardApi = {
    metrics: ()=>request('/api/dashboard/metrics'),
    porEstado: ()=>request('/api/dashboard/por-estado'),
    porDependencia: ()=>request('/api/dashboard/por-dependencia'),
    porResponsable: ()=>request('/api/dashboard/por-responsable'),
    porEstadoPlan: ()=>request('/api/dashboard/por-estado-plan'),
    timeline: ()=>request('/api/dashboard/timeline'),
    prorrogas: ()=>request('/api/dashboard/prorrogas'),
    uploadsRecientes: ()=>request('/api/dashboard/uploads-recientes')
};
const directivoApi = {
    misMetricas: ()=>request('/api/dashboard/directivo/mis-metricas'),
    misHallazgos: (page = 1, perPage = 10)=>request('/api/dashboard/directivo/mis-hallazgos', {
            params: {
                page,
                per_page: perPage
            }
        }),
    misActividades: (page = 1, perPage = 10)=>request('/api/dashboard/directivo/mis-actividades', {
            params: {
                page,
                per_page: perPage
            }
        }),
    menciones: (page = 1, perPage = 10)=>request('/api/dashboard/directivo/menciones', {
            params: {
                page,
                per_page: perPage
            }
        }),
    porEstadoAccion: ()=>request('/api/dashboard/directivo/por-estado-accion')
};
const hallazgosApi = {
    list: (params)=>request('/api/hallazgos/', {
            params
        }),
    get: (id)=>request(`/api/hallazgos/${id}`),
    update: (id, data)=>request(`/api/hallazgos/${id}`, {
            method: 'PUT',
            body: data
        }),
    actividades: (id)=>request(`/api/hallazgos/${id}/actividades`),
    estados: ()=>request('/api/hallazgos/estados'),
    dependencias: ()=>request('/api/hallazgos/dependencias'),
    responsables: ()=>request('/api/hallazgos/responsables'),
    estadosPlan: ()=>request('/api/hallazgos/estados_plan'),
    vicepresidencias: ()=>request('/api/hallazgos/vicepresidencias'),
    direcciones: ()=>request('/api/hallazgos/direcciones')
};
const actividadesApi = {
    list: (params)=>request('/api/hallazgos/actividades', {
            params
        }),
    updateEstado: (id, estado_accion)=>request(`/api/hallazgos/actividades/${id}/estado`, {
            method: 'PATCH',
            body: {
                estado_accion
            }
        }),
    checklist: (page = 1, perPage = 15)=>request('/api/hallazgos/checklist', {
            params: {
                page,
                per_page: perPage
            }
        })
};
const uploadsApi = {
    upload: (file)=>{
        const form = new FormData();
        form.append('file', file);
        return request('/api/uploads/', {
            method: 'POST',
            body: form,
            isFormData: true
        });
    },
    analyze: (file)=>{
        const form = new FormData();
        form.append('file', file);
        return request('/api/uploads/analyze', {
            method: 'POST',
            body: form,
            isFormData: true
        });
    },
    history: (params)=>request('/api/uploads/history', {
            params
        }),
    detail: (id)=>request(`/api/uploads/history/${id}`),
    delete: (id)=>request(`/api/uploads/history/${id}`, {
            method: 'DELETE'
        })
};
const gestorApi = {
    misMetricas: ()=>request('/api/dashboard/gestor/mis-metricas'),
    porEstado: ()=>request('/api/dashboard/gestor/por-estado'),
    porEstadoPlan: ()=>request('/api/dashboard/gestor/por-estado-plan'),
    porSemaforo: ()=>request('/api/dashboard/gestor/por-semaforo'),
    hallazgos: (page = 1, perPage = 50)=>request('/api/dashboard/gestor/hallazgos', {
            params: {
                page,
                per_page: perPage
            }
        }),
    actividades: (page = 1, perPage = 100)=>request('/api/dashboard/gestor/actividades', {
            params: {
                page,
                per_page: perPage
            }
        }),
    responsablesCriticos: ()=>request('/api/dashboard/gestor/responsables-criticos'),
    bitacora: ()=>request('/api/dashboard/gestor/bitacora'),
    tiempoPromedio: ()=>request('/api/dashboard/gestor/tiempo-promedio')
};
const notificacionesApi = {
    list: ()=>request('/api/notificaciones/'),
    markRead: (id)=>request(`/api/notificaciones/${id}/read`, {
            method: 'PATCH'
        }),
    markAllRead: ()=>request('/api/notificaciones/read-all', {
            method: 'PATCH'
        })
};
const usersApi = {
    list: ()=>request('/api/users/'),
    get: (id)=>request(`/api/users/${id}`),
    create: (data)=>request('/api/users/', {
            method: 'POST',
            body: data
        }),
    update: (id, data)=>request(`/api/users/${id}`, {
            method: 'PUT',
            body: data
        }),
    delete: (id)=>request(`/api/users/${id}`, {
            method: 'DELETE'
        }),
    dependencias: ()=>request('/api/users/dependencias')
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/auth.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AuthProvider",
    ()=>AuthProvider,
    "useAuth",
    ()=>useAuth
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/api.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
'use client';
;
;
const AuthContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])(null);
function AuthProvider({ children }) {
    _s();
    const [user, setUser] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AuthProvider.useEffect": ()=>{
            const token = localStorage.getItem('access_token');
            const stored = localStorage.getItem('user');
            if (token && stored) {
                try {
                    setUser(JSON.parse(stored));
                } catch  {
                    localStorage.removeItem('user');
                }
            }
            setLoading(false);
        }
    }["AuthProvider.useEffect"], []);
    const login = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AuthProvider.useCallback[login]": async (email, password)=>{
            const res = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["authApi"].login(email, password);
            const { access_token, user: u } = res.data;
            localStorage.setItem('access_token', access_token);
            localStorage.setItem('user', JSON.stringify(u));
            setUser(u);
        }
    }["AuthProvider.useCallback[login]"], []);
    const logout = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AuthProvider.useCallback[logout]": ()=>{
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["authApi"].logout().catch({
                "AuthProvider.useCallback[logout]": ()=>{}
            }["AuthProvider.useCallback[logout]"]);
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');
            setUser(null);
            window.location.href = '/login';
        }
    }["AuthProvider.useCallback[logout]"], []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(AuthContext.Provider, {
        value: {
            user,
            loading,
            login,
            logout,
            isVice: user?.rol === 'vicepresidente',
            isDirectivo: user?.rol === 'directivo',
            isProfesional: user?.rol === 'profesional',
            isGestor: user?.rol === 'gestor'
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/lib/auth.tsx",
        lineNumber: 72,
        columnNumber: 5
    }, this);
}
_s(AuthProvider, "xsdc9TxC9UEPgrnOhh3PNEWMk/8=");
_c = AuthProvider;
function useAuth() {
    _s1();
    const ctx = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
}
_s1(useAuth, "/dMy7t63NXD4eYACoT93CePwGrg=");
var _c;
__turbopack_context__.k.register(_c, "AuthProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/ThemeProvider.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ThemeProvider",
    ()=>ThemeProvider
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$themes$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next-themes/dist/index.mjs [app-client] (ecmascript)");
'use client';
;
;
function ThemeProvider({ children, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$themes$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ThemeProvider"], {
        ...props,
        children: children
    }, void 0, false, {
        fileName: "[project]/components/ThemeProvider.tsx",
        lineNumber: 10,
        columnNumber: 10
    }, this);
}
_c = ThemeProvider;
var _c;
__turbopack_context__.k.register(_c, "ThemeProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_0ji8m6o._.js.map