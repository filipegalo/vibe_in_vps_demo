# vibe_in_vps demo

This repository is a live demo of [vibe_in_vps](https://github.com/filipegalo/vibe_in_vps) — a zero-ops deployment template that lets you deploy any Dockerized app to a cheap VPS with just a `git push`.

## What's running here

- Infrastructure provisioned automatically via Terraform (Hetzner VPS)
- App deployed via GitHub Actions CI/CD pipeline
- Custom domain + HTTPS via Cloudflare Tunnel

All of this with zero manual server configuration.

## How it works

1. Push code to `main`
2. GitHub Actions builds the Docker image and pushes to GHCR
3. The app is deployed to a Hetzner VPS via SSH

That's it. No Kubernetes, no AWS console, no YAML headaches.

## Want to deploy your own app?

Check out the original project: **[github.com/filipegalo/vibe_in_vps](https://github.com/filipegalo/vibe_in_vps)**
