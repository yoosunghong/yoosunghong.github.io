---
title: "공간 예측 및 전술 대응 3계층 시스템"
description: "월드 모델을 통한 MCTS 최적화와 분산 강화학습, UE5의 EQS를 활용한 3계층 하이브리드 AI 프레임워크"
weight: 1
translationKey: "project-1"
duration: "2025.08 ~ 2026.03"
team_size: "1명"
role: "메인 프로그래머"
github: "https://github.com/Hongyoosung/GOBTv2.0"
math: true
---

---

## 개요

본 프로젝트는 Unreal Engine 5 환경의 팀 전투를 위한 실시간 계층형 AI 프레임워크입니다. 전략(Strategy), 전술(Tactics), 위치 선정(Positioning)이라는 세 가지 의사결정 층위를 서로 다른 알고리즘으로 결합하여 복합적인 분대 행동을 구현합니다.

* **Strategic Layer (Squad Commander)**: World Model 기반의 MCTS를 사용해 현재 분대의 최적 전략 배치를 수립합니다.

* **Tactical Layer (Executor Agents)**: PPO로 학습된 정책 네트워크가 역할군(Assault/Defend/Support)에 맞춰 UE5의 EQS(Environment Query System) 가중치를 위한 파라미터를 출력합니다.

* **Spatial Layer (EQS Integration)**: 정책 네트워크로부터 전달 받은 파라미터를 EQS 시스템의 8가지 가중치 테스트에 입력하여 최종 이동 목표를 산출합니다.


이러한 수직적 통합을 통해 **전략 간 시너지의 발견**, **개별 전략의 최적 행동 수립**을 실현하면서도 프레임당 15ms 이내의 연산 비용을 유지하여 실시간 성능을 확보했습니다.

---

## System Architecture Overview

[Image: Three-layer architecture diagram. Top layer (Layer 1): Squad Commander box containing "MCTS + World Model" with input arrow labeled "FTeamWorldState (70-dim)" and output arrow labeled "ETacticalPlay (1 of 10)". Middle layer (Layer 2): Five parallel Agent boxes, each labeled "PPO Policy (52→6)" with input arrows from Layer 1 labeled "Role Assignment (Assault/Defend/Support)" and output arrows labeled "EQS Weights (6-dim)". Bottom layer (Layer 3): Five parallel EQS boxes, each labeled "48 samples × 8 tests" with output arrows to "NavMesh Target". Vertical timing annotations: Layer 1 = "500ms cycle / 15ms budget", Layer 2 = "Per-step inference (<1ms)", Layer 3 = "Per-query (~2ms)". Side panel: data flow arrows showing the feedback loop from game state back to Layer 1.]

---

## Tech Stack

| Category | Technologies |
|---|---|
| **Game Engine** | Unreal Engine 5.6 (C++17) |
| **RL Framework** | Ray RLlib 2.7, PyTorch |
| **UE5-Python Bridge** | Schola Plugin (gRPC-based) |
| **Neural Network Inference** | ONNX Runtime via UE5 NNE (Neural Network Engine) |
| **Containerization** | Docker (Linux training containers) |
| **Communication** | gRPC (Schola protocol) |
| **Monitoring** | TensorBoard, custom per-strategy metric callbacks |


---

### Decision Flow

```
Game State (70-dim)
    │
    ▼
┌─────────────────────────────────────────────┐
│  Layer 1: Squad Commander (ASquadManager)   │
│  ┌───────────────────────────────────────┐  │
│  │  UTeamMCTS: Time-budgeted tree search │  │
│  │  ┌─────────────────────────────────┐  │  │
│  │  │  UTeamWorldModel (ONNX/NNE)    │  │  │
│  │  │  Input: State(60) + Play(10)   │  │  │
│  │  │  Output: NextState + Reward    │  │  │
│  │  │         + Confidence           │  │  │
│  │  └─────────────────────────────────┘  │  │
│  │  Selection: ConfidenceUCB             │  │
│  │  Action Space: 10 Tactical Plays      │  │
│  └───────────────────────────────────────┘  │
│  Output: Role[5] = {Assault, Defend, Support} │
└─────────────────────────────────────────────┘
    │ SetCommandedStrategy()
    ▼
┌─────────────────────────────────────────────┐
│  Layer 2: Executor Agents (×5)              │
│  ┌─────────────────────────────────────┐    │
│  │ SingleHeadPolicy (PPO-trained)      │    │
│  │ Input:  52-dim (49 obs + 3 role)    │    │
│  │ Network: [256,256] + LayerNorm      │    │
│  │ Output: 6-dim EQS weights [-1,1]   │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
    │ EQS Weight Parameters
    ▼
┌─────────────────────────────────────────────┐
│  Layer 3: EQS Spatial Reasoning             │
│  48 candidate positions × 8 weighted tests  │
│  Output: Best tactical location → NavMesh   │
└─────────────────────────────────────────────┘
```

The key architectural insight is that each layer operates on a different time scale and abstraction level. The Squad Commander reasons about team-level state transitions over multi-second horizons. The RL policies map moment-to-moment observations to spatial preferences. The EQS converts abstract preferences into concrete, physically valid positions on the navigation mesh. This separation allows each component to be trained, tuned, and debugged independently.



---


## 핵심 기능 (Key Features)

### 1. 학습된 월드 모델 기반의 중앙 집중형 MCTS

커맨더는 MCTS(Monte Carlo Tree Search)를 실행하여 10가지 사전 정의된 '전술 플레이(Tactical Plays)' 중 하나를 선택합니다. 전술 플레이에는 *PincerManeuver*(포위 기동: 돌격 3 + 지원 2) 또는 *BaitStrategy*(유인 전략: 돌격 1 유인 + 방어 4 매복) 등 분대의 전략 배치 내용이 포함됩니다.

런타임 시 MCTS는 환경을 직접 시뮬레이션하는 것 대신 **학습된 월드 모델**(`UTeamWorldModel`)을 사용하여 상태 전이를 예측합니다. 이 모델은 70차원 입력(팀 상태 60차원 + 전술 플레이 원-핫 인코딩 10차원)을 받아 다음 상태(60D), 복합 보상 벡터(승률, 체력 변화, 오브젝트 점수), 그리고 신뢰도 점수를 출력합니다.

<br>

**신뢰도 기반 UCB 선택 (Confidence-Aware UCB Selection)**

트리 탐색 시 월드 모델의 신뢰도 출력을 반영하도록 수정된 UCB 공식을 사용합니다.

$$\mathrm{ConfidenceUCB} = Q(s,a) + C_{PUCT} \times \sqrt{\frac{\ln N_{parent}}{N_{child}}} - K_{RISK} \times (1 - confidence)$$

신뢰도가 0.3 미만인 예측은 완전히 제외하여, 저품질의 모델 예측이 탐색 트리를 오염시키는 것을 방지합니다. 이는 데이터가 부족한 희귀 상태에서 월드 모델이 부정확할 수 있는 문제를 해결하는 핵심 메커니즘입니다.

<br>

**실행 가능성 필터링 (Feasibility Gating)**

트리 확장 전, 현재 게임 상태에 따라 각 전술 플레이를 필터링합니다. 예를 들어 '방어 중심' 플레이는 아군이 점유한 거점이 하나 이상 있어야 하며, '지원 중심' 플레이는 생존한 아군이 본인을 포함한 2명 이상이어야 합니다. 실행 가능한 플레이가 없을 경우 *AllOutRush*(전원 돌격)가 기본값으로 작동합니다.

> **[이미지 설명: MCTS 트리 시각화]**
> 루트 노드 "현재 상태"에서 10개의 자식 브랜치(전술 플레이)로 3단계 확장된 모습. 각 노드에는 방문 횟수(N), Q값, 신뢰도 점수, 예측 보상 벡터 표시. 최적 경로는 굵은 선으로 강조하고, 신뢰도가 낮거나 실행 불가능한 브랜치는 회색으로 처리. (데이터: 50회 반복, 15ms 예산)

---

### 2. 분산 다중 에이전트 강화학습 (MARL)

각 에이전트는 할당된 전략에 따라 독립적인 PPO 학습 정책을 실행합니다. 역할별(돌격, 방어, 지원) 목표 차이로 인한 그래디언트 간섭을 제거하기 위해 공유 모델 대신 **3개의 독립된 정책 네트워크**를 사용하는 아키텍처를 채택했습니다.

<br>

#### **네트워크 아키텍처 구성도**

| 구분 | 레이어 (Layer) | 구성 요소 및 활성화 함수 | 출력 차원 (Output Dim) | 비고 |
| --- | --- | --- | --- | --- |
| **Input** | **Input Data** | 로컬 관측(49D) + 전략(3D) | **52** | 원-핫 인코딩 포함 |
| **Encoder** | **Linear 1** | Linear + ReLU + LayerNorm | 256 | 특징 추출 시작 |
| **Encoder** | **Linear 2** | Linear + ReLU + LayerNorm | **256** | 공통 임베딩 벡터 |
| **Head 1** | **Action Head** | Linear + Tanh (추정) | **6** | EQS 가중치 (범위: [-1, 1]) |
| **Head 2** | **Value Head** | Linear | **1** | 상태 가치 $V(s)$ |

---

#### **49차원 관측 공간 구성 (Observation Space Details)**

| 대분류 | 세부 항목 | 계산 방식 | 차원 (Dim) | 비고 |
| --- | --- | --- | --- | --- |
| **자기 상태 (Self)** | 위치, 체력, 속도, 쿨타임 | 단일 에이전트 정보 | **8** | 기본 생존 및 기동 데이터 |
| **아군 상태 (Allies)** | 상대 위치, 체력 | 4명 × 4차원 | **16** | 팀워크 및 진형 파악 |
| **적군 상태 (Enemies)** | 상대 위치, 가시성 플래그 | 5명 × 4차원 | **20** | 탐지 시 위치 정보 포함 |
| **맵 상태 (Map)** | 거점 점유 상태 | 5개 거점 × 1차원 | **5** | 승리 조건(Objective) 데이터 |
| **합계** |  |  | **49** |  |



#### 전략 조건부 보상 설계 (Strategy-Conditioned Reward Shaping)
각 역할의 전술적 목표에 맞춤화된 보상 함수를 적용했습니다.

* **돌격 (Assault):** 적 점령지 접근, 점령 진행도, 점령 후 추진력에 보상. 전투 지역 외 대기 시 패널티.
* **방어 (Defend):** 아군 점령지 내 근접 보너스, 대미지 흡수를 통한 거점 유지 보상. 구역 이탈 시 거리 패널티.
* **지원 (Support):** 부상당한 아군 추적 보상(급격한 타겟 변경 방지를 위해 5-step 캐시 적용). 힐링량, 후방 위치 선정, 아군 방치 후 교전 시 패널티.

**학습 인프라:**

* Ray RLlib을 이용한 멀티 에이전트 설정 및 `policy_mapping_fn`을 통한 전략별 라우팅
* 전략별 데이터 균형을 위한 리플레이 버퍼(33/33/33% 분포 유지)
* UE5 NNE(Neural Network Engine)를 통한 ONNX 모델 추론

---

### 3. EQS 기반 공간 추론

환경 쿼리 시스템(EQS)은 추상적인 RL 출력을 실제 물리적 위치로 변환합니다. EQS 실행기(`UMocEQSExecutor`)는 RL 정책이 출력한 6차원 가중치 벡터를 받아, 내비게이션 메쉬에서 샘플링된 48개 후보 지점에 대해 8개의 가중치 스코어링 테스트를 수행합니다.

**6가지 EQS 가중치 차원:**
| 인덱스 | 파라미터 | 전술적 의미 |
|---|---|---|
| 0 | 적 거점 근접도 | 적군 점령지 근처 위치 선호도 |
| 1 | 아군 거점 근접도 | 아군 점령지 근처 위치 선호도 |
| 2 | 엄폐 밀도 | 주변 엄폐물이 많은 지형 선호도 |
| 3 | 적 가시성 | 적의 시야 노출 여부 선호도 |
| 4 | 아군 근접도 | 팀원과의 거리 유지 선호도 |
| 5 | 교전 거리 | 선호하는 교전 사거리 유지 |

이러한 **디커플링(Decoupling)** 을 통해 RL 정책은 '어떤 공간적 특성이 중요한지'를 학습하고, 실제 경로 탐색, 장애물 회피 등의 물리적 처리는 언리얼 엔진의 내비게이션 시스템이 담당하여 학습의 효율성을 향상시킵니다.

---

### 4. 이벤트 드리븐 재계획 (Event-Driven Replanning)

MCTS는 고정된 타이머(500ms)에 더해서 에이전트의 사망, 킬, 거점 점유 상태 변화 등 핵심 게임 이벤트 발생 시 옵저버 패턴을 통해 즉시 재계획을 트리거합니다.

이를 통해 아군 사망 시 즉시 '공격'에서 '거점 방어'로 전환하거나, 적 처치 시 즉시 '전원 돌격'으로 전환하는 등 **유동적인 상황 대응**이 가능합니다.

---

### 5. 듀얼 모드 아키텍처 (Dual-Mode Architecture)

모든 주요 컴포넌트는 단일 UE5 바이너리 내에서 **학습 모드**와 **추론 모드**를 동시에 지원하도록 설계하여 데이터 수집 환경과 실제 서비스 환경 사이의 괴리를 제거하였습니다.

| 컴포넌트 | 학습 모드 (Training) | 추론 모드 (Inference) |
| --- | --- | --- |
| MCTS 커맨더 | $\epsilon$-greedy / 랜덤 플레이 샘플링 | 월드 모델 기반 MCTS 전체 실행 |
| 에이전트 실행 | 동기식 EQS → 즉시 이동 | 블랙보드 → 비헤이비어 트리(BT) |
| 월드 모델 | 스텁(Stub) 모드 (중립 예측) | ONNX NNE 실시간 추론 |
| EQS 실행기 | 블로킹(Blocking) 쿼리 | 콜백 기반 비동기(Async) 쿼리 |


---

## 기술적 난제 및 해결 방안

### **Problem: 실시간 환경에서의 MCTS 연산 병목 현상** 

초기 아키텍처는 팀 전략 배치를 위해 중앙 집중식 MCTS(몬테카를로 트리 탐색)를 도입했으나, 실시간 슈팅 게임 환경에서의 정교한 탐색을 위해 필요한 관측 공간이 방대하다는 문제가 있었습니다. 실제로 테스트 스텁 MCTS 연산을 수행한 결과 16.6ms(60FPS 기준)의 프레임 제한을 초과했습니다.

#### Goal 
전술적 협업의 품질을 유지하면서, MCTS 연산 비용을 실시간 제약 조건 내로 줄이는 것.

#### Soulution

1. **학습된 월드 모델(Learned World Model):** 고비용의 게임 상태 시뮬레이션을 대체하기 위해, 배치(Batch)당 1.8ms 미만으로 상태 전이를 예측하는 ONNX 신경망(`UTeamWorldModel`, Residual Block 기반 70→256→512→256 구조)을 도입했습니다.
2. **신뢰도 기반 탐색(Confidence-gated search):** 월드 모델에 신뢰도 출력 헤드를 추가했습니다. 신뢰도가 0.3 미만인 예측은 폐기하여 신뢰할 수 없는 데이터가 탐색 트리를 오염시키는 것을 방지했습니다. 모델 훈련 전 사용하는 스텁(Stub) 모드에서는 신뢰도를 0.1로 출력하여 휴리스틱 계획으로 유연하게 전환(Graceful Degradation)되도록 설계했습니다.
3. **배치 리프 확장(Batch leaf expansion):** 각 MCTS 반복 단계에서 선택된 노드의 10개 전술 플레이 자식 노드를 모두 생성하고, 이를 단일 월드 모델 추론 호출로 배치 처리하여 반복당 지연 시간을 단축했습니다.

#### Result
 MCTS가 월드 모델의 출력값을 기반으로 연산을 수행하여 계획 연산 시간이 75ms에서 15ms로 단축(5배 개선)되었습니다.


---

### Problem: UE5 환경과 Rllib 환경의 통신 표준 프레임워크의 필요성

기존 UE5에서 제공하는 강화학습 프레임워크인 **Learning Agent**는 UE5 로컬에서만 동작하기에 Python Ray Rllib의 분산 강화학습이라는 이점을 활용할 수 없었습니다.


#### Goal
UE5와 Python(Ray RLlib) 간의 고성능 강화학습 파이프라인을 구축하기 위해 안정적인 통신 수단과 표준 포멧이 포함된 프레임워크의 확보.


#### Solution: Schola Plugin의 도입

AMD의 오픈소스 라이브러리 Schola를 프레임워크로 채택하였으며 아래와 같은 이점을 얻었습니다.

* **표준 포멧 및 환경 구성**: Schola는 UE5에서 RL을 위한 관측(UBoxObserver)과 액션(UBoxActuator) 인터페이스를 제공하며 에이전트를 위한 전용 컨트롤러(AAbstractTrainer)와 Rllib와의 주요 통신 인터페이스(AStaticScholaEnvironment)를 통해 직관적인 RL 환경 구성을 가능하게 합니다.


* **래핑 및 gRPC 통신 브릿지:** Schola는 UE5 내의 데이터를 Python의 gym.Env 형태로 래핑하고 gRPC 프로토콜 기반의 직렬화를 통해 저지연으로 Rllib 환경과 통신하는 API를 제공합니다.


#### Result
오픈소스 라이브러리 Schola 프레임워크에서 제공하는 인터페이스를 통해 직접적인 래퍼 환경을 구축하지 않고도 UE5와 Python Ray Rllib의 통신을 성공적으로 완료하였습니다. 이를 통해 개발 효율을 대폭 향상시켰습니다.


```python
from ray.rllib.env.multi_agent_env import MultiAgentEnv
RLLIB_AVAILABLE = True

from schola.core.env import ScholaEnv, AutoResetType
from schola.core.unreal_connections.editor_connection import UnrealEditorConnection
SCHOLA_AVAILABLE = True
```

---
### Problem: 통신 환경 격리 및 Windows 멀티 워커 이슈 해결

Windows 환경에서 Ray의 멀티 워커 아키텍처를 구동할 때 (1) 가중치 동기화 중 Learner 액터 정지 현상, (2) 단일 UE5 인스턴스 점유로 인한 처리량 제한 문제를 발견했습니다.


#### Goal
UE5와의 안정적인 통신을 유지하면서 OS 의존성 없는 확장 가능한 멀티 워커 훈련 파이프라인 구축.

#### Solution
* **Docker 컨테이너화**: Python 훈련 스크립트와 Ray RLlib 의존성을 Linux Docker 컨테이너로 패키징하여 Windows 특유의 프로세스 생성(spawn/fork) 호환성 이슈를 원천 차단했습니다.

* **gRPC 포트 라우팅 최적화**: Schola의 연결 구조를 커스텀하여 각 RLlib env-runner가 base_port + worker_index로 고유 포트를 할당받도록 설정, 여러 워커가 독립적인 UE5 인스턴스에 동시 접속하게 했습니다.

* **환경 변수 기반 오케스트레이션**: NUM_SCHOLA_ENVS, NUM_WORKERS 등을 환경 변수로 관리하여 소스 코드 수정 없이 Docker Compose 설정만으로 학습 규모와 하이퍼 파라미터를 동적으로 조절하도록 설계했습니다.


#### Result
훈련 처리량에 따라 UE5와 Python 인스턴스를 동적으로 확장할 수 있게 되었습니다. Docker 기반 파이프라인 도입으로 로컬 환경 의존성을 완전히 제거했으며, Docker Compose를 통해 신속한 **하이퍼파라미터 스윕(Hyperparameter Sweep)**을 가능하게 하였습니다.

---


도전 과제 3: 멀티 에이전트 에피소드 경계에서의 학습 프리징(정지) 현상
상황: 학습 도중 시스템이 Python 스텝 약 1,000회(UE5 스텝 약 501회) 지점에서 지속적으로 멈추는 현상이 발생했습니다. 조사 결과, Python과 UE5 사이에 25배의 스텝 수 불일치가 발견되었습니다. Python은 실제 환경 스텝을 21회만 기록한 반면, UE5는 501회를 처리한 상태였습니다. 생존한 에이전트는 가중치 업데이트를 받지 못하고 멈췄으며, 사망한 에이전트는 무한 루프를 돌고 있었습니다.

과제: 학습 데이터 손실이나 에피소드 경계 로직의 불안정화 없이 프리징 현상을 진단하고 해결할 것.

해결 조치:

근본 원인 분석: 두 개의 충돌하는 에피소드 종료 시스템을 식별했습니다. Schola의 AutoResetType::SAME_STEP은 개별 에이전트 사망 시 자동 리셋을 트리거했으나, Python 측에서는 RLlib에서 혼합 궤적(mixed-trajectory) 배치가 생성되는 것을 방지하기 위해 모든 종료 신호를 억제하고 있었습니다. 이로 인해 사망한 에이전트가 '부활-사망' 무한 루프에 빠져 Schola의 모든 스텝 예산을 소모해 버린 것입니다.

수정 1 — 일관된 종료 의미론 적용: IsEpisodeDone()이 MaxEpisodeSteps에서만 true를 반환하도록 수정했습니다. 이는 사망한 에이전트에 대해 이미 Running 상태를 반환하던 ComputeStatus()와 일관성을 맞춘 것으로, 이를 통해 자동 리셋 루프를 중단시켰습니다.

수정 2 — 균일한 스텝 카운팅: 수정 1 이후 두 번째 프리징이 발생했습니다. 생존 에이전트는 MaxEpisodeSteps에 도달해 Truncated 상태가 되었으나, 액션 드레인(action-drain) 경로에서 스텝 카운터가 증가하지 않던 사망 에이전트들이 여전히 Running 상태로 남아 AllDone=true 처리를 차단했습니다. 사망 에이전트의 드레인 경로에 CurrentEpisodeSteps++를 추가하여 모든 에이전트가 동시에 타임아웃에 도달하도록 했습니다.

프리징 진단: RLlib로 반환하기 전 보상 및 관측값에서 NaN/Inf를 감지하는 계측 로직을 추가했으며, 환경 정지와 RLlib 학습 정지를 구분하기 위해 스텝 간 간격 모니터링 기능을 도입했습니다.

결과: 학습이 프리징 없이 성공적으로 완료됩니다. 모든 에이전트가 에피소드 경계에서 동시에 종료되어, RLlib 후처리를 위한 깨끗한 단일 궤적 배치를 생성합니다. 진단 계측 로직은 향후 디버깅을 위해 활성 상태로 유지됩니다.

[이미지: 프리징 시나리오를 보여주는 타임라인 다이어그램. 두 개의 수평 레인: "생존 에이전트"와 "사망 에이전트". 사망 에이전트 레인은 "사망 → 자동 리셋 → 사망 → 자동 리셋 → ..."의 급격한 사이클로 모든 스텝 예산을 소모하는 반면, 생존 에이전트 레인은 진전 없이 "대기 중..." 상태를 보임. "수정: 사망을 종료 조건에서 제거"라는 라벨이 붙은 화살표가 이 사이클을 끊음. 수정 후 두 레인 모두 "MaxEpisodeSteps → 에피소드 종료"까지 균일하게 진행됨.]

도전 과제 4: 멀티 전략 정책 학습에서의 그래디언트 간섭
상황: 초기 v10.2.0 아키텍처는 공유 인코더가 3개의 전략별 헤드(Head)에 연결된 단일 멀티 헤드 모델을 사용했습니다. 학습 결과, Assault(돌격)와 Defend(방어) 헤드는 정상적으로 학습되었으나 Support(지원) 헤드가 붕괴되었습니다(입력과 상관없이 출력이 0에 수렴). 분석 결과, 근본적으로 목표가 상반된 역할들(Assault: 적에게 접근, Support: 아군 뒤에 대기)로부터 공유 인코더가 서로 모순되는 그래디언트 신호를 전달받아 간섭이 발생한 것으로 나타났습니다.

과제: 전략 간 학습 인프라를 공유하는 능력은 유지하면서 그래디언트 간섭을 제거할 것.

해결 조치:

독립적인 단일 헤드 정책 (v10.2.1): 공유 인코더 기반의 멀티 헤드 모델을 3개의 완전히 독립적인 SingleHeadPolicy_v10_2 인스턴스로 교체했습니다. 각 정책은 자체 인코더, 액션 헤드, 가치 헤드 및 학습 가능한 로그 표준 편차(log standard deviation)를 가집니다.

RLlib 멀티 에이전트 라우팅: 관측값에 원-핫 인코딩된 전략 정보를 기반으로, 각 에이전트를 올바른 전략별 정책으로 연결하기 위해 policy_mapping_fn을 사용했습니다.

전략 균형 재생 버퍼(Replay Buffer): 3개의 독립적인 서브 버퍼(전략당 1개)를 갖춘 StrategyBalancedReplayBuffer를 구현하여, 역할 할당의 자연적인 분포와 관계없이 각 정책이 학습 데이터의 정확히 33%를 학습하도록 보장했습니다.

균등한 전략 분포: 환경 내에 force_uniform_strategy 모드를 추가했습니다. 이는 학습 중에 UE5 스쿼드 커맨더의 역할 할당을 무시하고 라운드 로빈 방식으로 역할을 분배하여, 3개 정책 모두 동일한 데이터 양을 수신하도록 강제합니다.

결과: 이제 세 가지 전략 헤드 모두 간섭 없이 독립적으로 수렴합니다. Support 정책은 치유 우선순위 및 후방 경계 포지셔닝 동작을 적절히 학습합니다. 전략별 TensorBoard 지표(평균 보상, 엔트로피, 정책 손실 등)를 독립적으로 모니터링할 수 있게 되었습니다.

