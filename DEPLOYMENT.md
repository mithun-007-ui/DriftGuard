# AWS EC2 Deployment Guide — DriftGuard Platform

This guide outlines the complete, production-minded procedure for provisioning, configuring, and deploying **DriftGuard — Infrastructure Configuration Drift Detection Platform** on an Ubuntu AWS EC2 virtual machine.

---

## 1. Prerequisites and Planning

- AWS account with permission to launch EC2 instances and manage Security Groups.
- Local SSH client (`ssh` or PuTTY) with an SSH key pair (`.pem` file).
- No cloud credentials or SSH keys are embedded in this repository.

### Recommended Instance Sizing & Cost Optimization
- **Instance Type:** `t3.small` (2 vCPUs, 2 GB RAM) or `t3.micro` (1 vCPU, 1 GB RAM, eligible for AWS Free Tier).
- **Operating System:** Ubuntu 24.04 LTS (HVM), SSD Volume Type (`ami-04b4f1a9cf54c11d0` or latest in your chosen region).
- **Storage:** 20 GB gp3 root volume.

---

## 2. AWS Security Group Configuration

Create a dedicated Security Group named `driftguard-sg` with strict ingress rules:

| Type | Protocol | Port Range | Source | Justification |
| :--- | :--- | :--- | :--- | :--- |
| **SSH** | TCP | 22 | `YOUR_PUBLIC_IP/32` | **Restricted SSH access** (never leave open to `0.0.0.0/0`). |
| **HTTP** | TCP | 80 | `0.0.0.0/0` | Public web dashboard access for judges. |
| **HTTPS** (Optional) | TCP | 443 | `0.0.0.0/0` | Secure SSL traffic (if custom domain configured). |

> **Security Note:** Port `5000` (Flask backend) is intentionally **not** exposed publicly. All traffic to the API is routed securely through Nginx on port 80.

---

## 3. Launching the EC2 Instance

1. Navigate to the **AWS Management Console &rarr; EC2 &rarr; Launch Instance**.
2. **Name:** `driftguard-hackathon-node`.
3. **AMI:** Ubuntu Server 24.04 LTS.
4. **Instance Type:** `t3.small` (or `t3.micro`).
5. **Key Pair:** Select your pre-generated key pair (e.g., `driftguard-key.pem`).
6. **Network Settings:**
   - VPC: Default VPC.
   - Auto-assign Public IP: **Enable**.
   - Security Group: Attach `driftguard-sg`.
7. **Storage:** 20 GiB General Purpose SSD (gp3).
8. Click **Launch Instance**.
9. Note the instance's **Public IPv4 Address** (e.g. `54.210.88.120`).

---

## 4. Connecting and Installing Docker

Connect to your instance via SSH:

```bash
chmod 400 driftguard-key.pem
ssh -i "driftguard-key.pem" ubuntu@<YOUR_EC2_PUBLIC_IP>
```

Update system packages and install official Docker Engine and Docker Compose:

```bash
# Update repositories
sudo apt-get update && sudo apt-get upgrade -y

# Install prerequisites
sudo apt-get install -y ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker packages
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Enable and start Docker service
sudo systemctl enable docker
sudo systemctl start docker

# Allow ubuntu user to execute docker commands without sudo
sudo usermod -aG docker ubuntu
newgrp docker
```

Verify Docker installation:

```bash
docker --version
docker compose version
```

---

## 5. Cloning and Configuring the Project

Clone the repository to the EC2 host:

```bash
git clone https://github.com/your-username/driftguard.git
cd driftguard
```

Configure environment variables:

```bash
cp .env.example .env
nano .env
```
Ensure `SECRET_KEY` is replaced with a unique secure string.

---

## 6. Building and Starting Containers

Build images and launch all microservices in detached mode:

```bash
docker compose up -d --build
```

Verify container status:

```bash
docker compose ps
```

You should see:
- `driftguard-frontend` (Port `80:80`)
- `driftguard-backend` (Port `5000:5000`, healthy)
- `driftguard-test-container` (Controlled test sandbox)

---

## 7. Verifying Deployment & Health Checks

Test the backend health check endpoint locally on the host:

```bash
curl -i http://localhost:5000/api/health
```

Expected HTTP response:
```json
{
  "application": "DriftGuard",
  "auto_remediation_disabled": true,
  "read_only": true,
  "status": "healthy",
  "version": "1.0.0"
}
```

Test public access via your web browser:
```
http://<YOUR_EC2_PUBLIC_IP>
```

You will see the DriftGuard Cloud Operations Console dashboard load with all metrics, baselines, and test scenarios.

---

## 8. Log Inspection and Monitoring

Inspect real-time logs for backend or frontend containers:

```bash
# View backend Flask & collector logs
docker compose logs -f backend

# View Nginx access & error logs
docker compose logs -f frontend

# Check resource utilization
docker stats
```

---

## 9. Production Hardening (Optional HTTPS)

For production environments with a custom domain (e.g. `driftguard.example.com`):
1. Point your domain DNS A-record to the EC2 public IP.
2. Install Certbot on the host:
   ```bash
   sudo apt-get install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d driftguard.example.com
   ```
3. Update Security Group `driftguard-sg` to permit port 443 (HTTPS).

---

## 10. Post-Hackathon Teardown and Cleanup

To avoid ongoing AWS compute charges after the hackathon judging session:

1. On the EC2 host, stop running containers:
   ```bash
   docker compose down -v
   ```
2. In the AWS Management Console:
   - Navigate to **EC2 &rarr; Instances**.
   - Select `driftguard-hackathon-node`.
   - Click **Instance State &rarr; Terminate Instance**.
3. Under **Security Groups**, delete `driftguard-sg` once dependencies terminate.
4. Under **Elastic IPs** (if allocated), release any unused public IP addresses.
