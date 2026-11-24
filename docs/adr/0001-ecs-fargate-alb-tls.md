# ADR 0001: ECS Fargate behind an ALB, TLS on the ALB

- Status: accepted
- Date: 2026-11-24

## Context

The dashboard must run as a container on AWS with continuous delivery from GitHub Actions and be served at `https://signalbench.sholaayeni.xyz`.
The AWS organisation's SCP allows only eu-north-1 and forbids GitHub OIDC. DNS is on Namecheap.

## Decision

Run one Fargate task (arm64, 0.25 vCPU / 0.5 GB) behind an internet-facing ALB in two public subnets. Terminate TLS on the ALB with an ACM certificate
issued in eu-north-1, and redirect HTTP to HTTPS. Tasks have public IPs, so there's no NAT gateway, but their security group only admits the ALB.
GitHub Actions deploys with a least-privilege IAM user's access keys.

## Alternatives considered

- **CloudFront in front of the ALB.** A custom domain on CloudFront needs a us-east-1 certificate, which the SCP blocks.
- **Lightsail containers.** Cheaper, but not the setup this repo is meant to show.
- **One EC2 host with Docker Compose.** Cheaper, but deploys and TLS become the app's problem rather than the platform's.
- **GitHub OIDC.** The better credential model, but the SCP forbids it. The access keys are scoped to one repository and one service, and the
  rotation script swaps them in a single step.

## Consequences

About $25–30 a month, mostly the ALB. Rollouts are zero-downtime (100% minimum healthy) with automatic rollback through the circuit breaker.
If the SCP ever allows OIDC, swap the key-based credentials step for role assumption. Nothing else changes.
