/**
 * Simple hash-based router for SPA navigation
 */

class Router {
    constructor() {
        this.routes = {};
        this.currentRoute = null;
        this.currentComponent = null;

        // Listen for hash changes
        window.addEventListener('hashchange', () => this.handleRoute());
        window.addEventListener('load', () => this.handleRoute());
    }

    /**
     * Register a route
     * @param {string} path - Route path (e.g., 'home', 'chat/:id')
     * @param {Function} component - Component constructor
     */
    register(path, component) {
        this.routes[path] = component;
    }

    /**
     * Navigate to a route
     * @param {string} path - Route path
     * @param {object} params - Route parameters
     */
    navigate(path, params = {}) {
        const hash = params ? `#${path}?${new URLSearchParams(params).toString()}` : `#${path}`;
        window.location.hash = hash;
    }

    /**
     * Handle route changes
     */
    handleRoute() {
        const hash = window.location.hash.slice(1);
        const [path, queryString] = hash.split('?');
        const params = new URLSearchParams(queryString);

        // Parse route parameters
        const routeParams = {};
        params.forEach((value, key) => {
            routeParams[key] = value;
        });

        // Find matching route
        let component = this.routes[path];

        if (!component) {
            // Try to match dynamic routes
            for (const [routePath, routeComponent] of Object.entries(this.routes)) {
                if (routePath.includes(':')) {
                    const regex = new RegExp('^' + routePath.replace(/:[^/]+/g, '([^/]+)') + '$');
                    const match = path.match(regex);
                    if (match) {
                        component = routeComponent;
                        // Extract dynamic params
                        const paramNames = routePath.match(/:[^/]+/g);
                        if (paramNames) {
                            paramNames.forEach((name, index) => {
                                routeParams[name.slice(1)] = match[index + 1];
                            });
                        }
                        break;
                    }
                }
            }
        }

        if (component) {
            this.renderComponent(component, routeParams);
        } else {
            console.error('Route not found:', path);
        }
    }

    /**
     * Render a component
     * @param {Function} Component - Component constructor
     * @param {object} params - Route parameters
     */
    renderComponent(Component, params) {
        const app = document.getElementById('app');

        // Cleanup previous component
        if (this.currentComponent && this.currentComponent.cleanup) {
            this.currentComponent.cleanup();
        }

        // Clear app container
        app.innerHTML = '';

        // Create and render new component
        this.currentComponent = new Component(app, params);
        this.currentRoute = window.location.hash.slice(1);
    }

    /**
     * Go back to previous route
     */
    back() {
        window.history.back();
    }
}

// Create singleton instance
export const router = new Router();
