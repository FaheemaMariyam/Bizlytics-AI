# Nginx Gateway Architecture 

## Role of Nginx as the Single Gateway
In the Bizlytics SaaS architecture, Nginx acts as the **Reverse Proxy** and the single point of entry for all external traffic. This ensures that internal services like the FastAPI backend and Flower dashboard are kept secure and isolated within the private Docker network.

---

##  1. Infrastructure Setup (`docker-compose.yml`)
Nginx is the only service that exposes public ports. All other services are accessed internally.

```yaml
  # Nginx Gateway (The Front Door)
  nginx:
    image: nginx:alpine
    container_name: bizlytics_nginx
    ports:
      - "8080:80"                      # NEW: Moved to 8080 to avoid Windows System conflicts
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro  # Mounts the custom configuration
    depends_on:
      - backend
      - flower
```

> [!NOTE]
> **Internal vs. External Ports:** While the host machine uses port **8080** to access the gateway, Nginx inside the Docker container is still listening on port **80**. Docker Compose handles the translation between these two ports.

---

##  2. Core Routing Logic (`nginx.conf`)
The configuration uses `proxy_pass` to route traffic based on the URI path.

- **Root (`/`):** All traffic is proxied to the FastAPI server at `http://backend:8000`.
- **Flower (`/flower/`):** Monitoring traffic is proxied to the Celery Flower dashboard at `http://flower:5555/`.

---

##  3. Security Benefits
1. **Single Entry Point:** Only port **8080** is open to the public; port 8000 and 5555 are private.
2. **Protection:** Direct attacks on the application server (Uvicorn) are blocked by Nginx.
3. **Future (Subdomain Switching):** The current configuration is "Subdomain Ready." By replacing `X-Tenant-ID` with a URL-parsing rule in Nginx, we can automatically switch tenants based on the URL (e.g., `company_a.bizlytics.ai`).

---

##  4. How to Verify
Access the system via:
- **API:** `http://localhost:8080/`
- **Flower:** `http://localhost:8080/flower/`

Note: Ensure the `nginx.conf` file is present in the same directory as `docker-compose.yml`.
