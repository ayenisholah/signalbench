# Deployment

SignalBench runs as one container on **ECS Fargate (arm64)** in **eu-north-1**, behind an internet-facing **ALB** that terminates TLS for
`signalbench.sholaayeni.xyz`. GitHub Actions builds, pushes and rolls out every change to `main`, and redeploys nightly with fresh market data.

```
 GitHub Actions ──build arm64──▶ ECR signalbench/web:<sha>-<run>
       │                                     │
       └──register task def, update ──▶ ECS service signalbench-web (Fargate, 0.25 vCPU / 0.5 GB)
                                              ▲  :3000, only from the ALB security group
 Namecheap DNS                                │
 signalbench CNAME ──▶ ALB :443 (ACM cert, TLS 1.2+) ── :80 redirects to :443
```

## Constraints that shaped it

- The AWS organisation's SCP allows **only eu-north-1** and **forbids GitHub OIDC**.
  - CloudFront custom domains need an ACM certificate in us-east-1, so TLS ends at the ALB with a certificate issued in eu-north-1 instead.
  - GitHub Actions authenticate with access keys for a least-privilege IAM user, `signalbench-github-deployer`. It can push to one ECR repository,
    register task definitions, update one ECS service and pass the two SignalBench task roles to ECS tasks. Nothing else.
- DNS for `sholaayeni.xyz` is on Namecheap, so the two records below are added by hand.

## Stacks (CloudFormation, `infra/`)

| Stack                  | Template        | What it holds                                                                         |
| ---------------------- | --------------- | ------------------------------------------------------------------------------------- |
| `SignalBench-Registry` | `registry.yaml` | ECR `signalbench/web` (immutable tags, scan on push, keep 15), deployer IAM user      |
| `SignalBench-Network`  | `network.yaml`  | VPC `10.42.0.0/16`, two public subnets in two AZs, internet gateway (no NAT)          |
| `SignalBench-Cert`     | `cert.yaml`     | ACM certificate for `signalbench.sholaayeni.xyz`, DNS validation                      |
| `SignalBench-Service`  | `service.yaml`  | Cluster, roles, log group `/signalbench/prod/web`, ALB, target group, Fargate service |

The service uses the deployment circuit breaker with rollback: a release whose tasks fail the `/api/health` check is rolled back automatically.

## First-time setup

1. Create `SignalBench-Registry`, then `SignalBench-Network`.
2. Create `SignalBench-Cert`. Read the validation record with `aws acm describe-certificate` and add it in **Namecheap → Advanced DNS** as a
   `CNAME`. The host is the record name without `.sholaayeni.xyz`. The stack finishes once ACM issues the certificate.
3. Create `SignalBench-Service` with `DesiredCount=0` and `ImageUri=<repository uri>:bootstrap`. The image doesn't need to exist while no tasks run.
4. Run `scripts/aws/create-deployer-key.sh`. It creates the deployer's access key and pipes it straight into the repo's Actions secrets, then sets the
   `AWS_REGION`, `ECR_REPOSITORY`, `ECS_CLUSTER`, `ECS_SERVICE` and `APP_URL` variables.
5. In Namecheap, add `CNAME signalbench → <LoadBalancerDnsName output>`.
6. Run the **Deploy** workflow. The first run builds the real image, registers it and scales the service to 1 task. From then on, every push to `main`
   deploys.

> **Stack updates after go-live.** GitHub Actions owns the running task definition and task count, so the service stack's own values go stale
> (task definition `:1`, `DesiredCount=0`). Before updating `SignalBench-Service`, pass `DesiredCount=1` and the current image URI, or the update
> scales the service to zero.

## Workflows

| Workflow           | Trigger                                      | Does                                                                                                                                       |
| ------------------ | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `ci.yml`           | Pull requests, pushes to non-`main` branches | Lint, format check, typecheck, tests, fetch + backtest + build, container build and smoke test                                             |
| `deploy.yml`       | Push to `main`, manual                       | Runs CI's verify job, builds arm64, pushes to ECR, rolls out, waits for a stable service, then checks `/api/health` reports the new commit |
| `refresh-data.yml` | Daily 02:15 UTC, manual                      | Calls `deploy.yml`, so the newest candles are baked into a fresh image                                                                     |

Every action is pinned to a full commit SHA. Dependabot proposes updates weekly.

## Cost (eu-north-1, approximate)

ALB about $18/month, one Fargate task (0.25 vCPU / 0.5 GB, arm64) about $7/month, plus cents for logs and ECR. The total is about $25–30 a month.

## Rotating the deploy key

```sh
scripts/aws/create-deployer-key.sh --rotate
```

It stores the new key first and deletes the old ones only after that succeeds.
