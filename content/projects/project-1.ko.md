---
title: "UE5 & AWS 기반 대규모 분산 멀티 에이전트 강화학습"
description: "Ray RLlib과 Schola를 활용하여 5vs5 전술 AI 에이전트를 학습시킨 클라우드 기반 병렬 강화학습 파이프라인"
weight: 1
translationKey: "project-1"
duration: "2025.08 ~ 2026.03"
team_size: "1명"
role: "메인 프로그래머"
github: "https://github.com/yoosunghong/GOBTv2.0"
math: true
---

---

## 개요

본 프로젝트는 Unreal Engine 5 환경에서 5 vs 5 팀 거점 경쟁 에이전트 전투 환경을 타겟으로 합니다.

에이전트에게 3가지 전술적 역할(돌격, 방어, 지원)을 부여하고, 각 에이전트는 독립된 강화학습(RL) 정책 네트워크를 통해 최적의 공간 이동 파라미터(EQS 가중치)를 추론합니다.

특히, Schola 플러그인을 브릿지로 삼아 AWS 클라우드 인프라 상에서 Ray RLlib 기반의 대규모 병렬 학습 환경을 구축하여, 수십 개의 언리얼 엔진 인스턴스를 통해 동시에 데이터를 수집하고 정책을 업데이트하는 고성능 파이프라인을 완성했습니다.

---

## System Architecture Overview



---

## Tech Stack

| Category | Technologies |
|---|---|
| **Game Engine** | Unreal Engine 5.6 (C++17) |
| **RL Framework** | Ray RLlib 2.7, PyTorch |
| **UE5-Python Bridge** | Schola Plugin (gRPC-based) |
| **Neural Network Inference** | ONNX Runtime via UE5 NNE (Neural Network Engine) |
| **Containerization** | Docker (Linux training containers) |
| Cloud & Container	| AWS EC2 / EKS, Docker (Linux training containers)
| **Communication** | gRPC (Schola protocol) |
| **Monitoring** | TensorBoard |


---

### Decision Flow

```
Global Game State 
    │
    ▼
┌─────────────────────────────────────────────┐
│ Layer 1: Squad Commander (Team World Model) │
│ Output: 에이전트별 전술 역할 할당 (돌격/방어/지원)│
└─────────────────────────────────────────────┘
    │ Role Assignment (Strategy)
    ▼
┌─────────────────────────────────────────────┐
│ Layer 2: Executor Agents (×5 Multi-Agent)   │
│ ┌─────────────────────────────────────────┐ │
│ │ Independent PPO Policy (역할별 개별 네트워크) │ │
│ │ Input: 51-dim (48D Obs + 3D One-hot)    │ │
│ │ Output: 6-dim EQS weights [-1,1]        │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
    │ 6-dim Parameter Action
    ▼
┌─────────────────────────────────────────────┐
│ Layer 3: EQS Spatial Reasoning (UE5)        │
│ 48 candidate positions × 8 weighted tests   │
│ Output: 최적의 전술적 위치 도출 → NavMesh 이동 │
└─────────────────────────────────────────────┘
```


(squad commander는 협동 전략의 발견을 위해 하나의 전략에 너무 많은 데이터가 학습되지 않게 하기 위하여 전략을 골고루 분배하여 각 33%의 데이터만 학습되게 하였습니다. RL 정책은 순간의 관찰 결과를 바탕으로 공간적 선호도로 매핑합니다. EQS는 이러한 선호도를 기반으로 메시 상의 구체적인 유효 위치로 변환합니다. 이러한 분리를 통해 ~~ 등등)

---


## 관측 공간 및 전략별 보상 설계


### 관측 공간

| 데이터 구분 | 세부 항목 | | 설명 및 처리 방식 | 차원 |
| --- | --- | --- | --- | --- |
| **Self** | 위치, 체력, 속도 | 정규화된 맵 위치 및 에이전트의 현재 상태 | 7 |
| **Allies** | 상대 위치, 체력 | 최대 4명. 거리/시야 정규화 | 16 |
| **Enemies** | 적군 상대 위치, 시야 플래그 | 시권(Line of Sight) 내 적만 유효 좌표 제공 | | 20
| **Map** | 5개 거점 소유권 | 아군(+1), 중립(0), 적군(-1) 상태 플래그 | 5 |
| **Strategy** | 현재 부여된 전술 역할 | 돌격/방어/지원 |  One-hot 인코딩 벡터 | 3 |
| **합계** | | | | 51 |


### 보상 설계

단일 보상 체계에서 발생하는 그래디언트 간섭(Gradient Interference)을 막기 위해, 역할별 독립 네트워크를 구성하고 각 목표에 맞는 조밀한(Dense) 보상과 희소(Sparse) 보상을 설계했습니다.

**돌격 (Assault)**:
- **목표**: 적 거점 탈취 및 전선 푸시.
- **보상**: 중립, 적 거점 접근에 대한 스칼라 거리 보상, 비아군 구역 점유 및 캡처 진행률 기반 능동 보상, 점령 후 지속적인 전진을 유도하는 모멘텀 보너스 부여.


**방어(Defend)**:
- **목표**: 아군 거점 유지 및 적의 진입 차단.
- **보상**: 아군 거점 내 체류 시 기본 보상, 적이 거점을 위협할 때 거점 내부에 위치 시 추가 보상, 거점 내에서 적의 데미지를 흡수할 시 주어지는 내구도 보너스.

**지원(Support)**:
- **목표**: 아군 생존율 증가 및 후방 유지.
- **보상**: 체력이 낮은 아군을 추적하고 힐링을 틱 단위로 보상, 아군보다 뒤편에 위치하는 후방 포지셔닝 보너스, 아군이 부상 중인데 적을 처치할 경우 부여하는 역할 이탈 패널티.


---


## 핵심 기능 (Key Features)


### 1. 협동 전략 RL과 EQS 통합 로직 (Actuator Transformation)
강화학습 모델이 에이전트를 직접 움직이는 대신, 가중치(Weights) 를 출력하면 UE5의 환경 쿼리 시스템(EQS)이 이를 바탕으로 물리적 공간을 해석합니다.

RL 정책의 출력 공간은 Box([-1, 1]^6)이며, TacticalParameterActuator를 통해 다음 6개의 공간적 의미로 매핑됩니다.

| 파라미터 | 설명 |
| --- | --- |
| **EnemyObjectiveProximity** | 적 거점 접근 선호도 |
| **AllyObjectiveProximity** | 아군 거점 접근 선호도 |
| **CoverDensity** | 지형지물 엄폐 선호도 |
| **EnemyVisibility** | 적 가시성 (교전 혹은 회피) 선호도 |
| **AllyProximity** | 아군과의 진형 유지 선호도 |
| **CombatRange** | 최적의 무기 사거리 유지 선호도 |

---


RL 정책의 출력 -> UE5 액추에이터 변환 로직

```C++
// Schola Actuator가 Python의 Action Tensor를 UE5 EQS 파라미터로 디코딩
void UTacticalParameterActuator::TakeAction(const FBoxPoint& Action)
{
    // Action.Values: RLlib에서 도출된 6차원 Float 배열 [-1.0, 1.0]
    FEQSWeightParameters Weights;
    Weights.EnemyObjectiveProximity = Action.Values[0];
    Weights.AllyObjectiveProximity = Action.Values[1];
    Weights.CoverDensity = Action.Values[2];
    Weights.EnemyVisibility = Action.Values[3];
    Weights.AllyProximity = Action.Values[4];
    Weights.CombatRange = Action.Values[5];

    // 가중치 유효성 검사 및 클램핑
    if (!ValidateEQSWeights(Weights)) {
        Weights.Clamp();
    }

    // 에이전트의 블랙보드 업데이트 및 내비게이션 경로 재탐색 트리거
    if (MocAgent) {
        MocAgent->UpdateTacticalWeights(Weights); 
        MocAgent->PerformTacticalAction(); 
    }
}
```

이러한 Decoupling 아키텍처 덕분에 RL은 '어떤 전술이 유리한가(가중치)'라는 추상적 의사결정에 집중할 수 있었고, 복잡한 3D 환경에서의 물리적 충돌 처리나 경로 탐색 비용을 획기적으로 낮췄습니다.




### 1. 분산 다중 에이전트 강화학습 (MARL)

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

### 2. EQS 기반 공간 추론

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


### 3. AWS 클라우드 상의 병렬 학습을 위한 컨테이너화
언리얼을 리눅스 컨테이너화하여 AWS상에서 파이썬 스크립트와 연동. 대규모 병렬 환경 구축. 리소스 절약을 위한 전략 등.


---

### 4. 듀얼 모드 아키텍처 (Dual-Mode Architecture)

모든 주요 컴포넌트는 단일 UE5 바이너리 내에서 **학습 모드**와 **추론 모드**를 동시에 지원하도록 설계하여 학습된 모델을 곧바로 실제 서비스 환경에서 테스트할 수 있도록 하였습니다.



---

## 기술적 난제 및 해결 방안


---

### Problem 1: UE5 환경과 Rllib 환경의 통신 표준 프레임워크의 필요성

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
### Problem 2: 통신 환경 격리 및 Windows 멀티 워커 이슈 해결

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

### Problem 3: 멀티 에이전트 에피소드 경계에서의 학습 프리징(정지) 현상
훈련 도중 에피소드의 경계에서 시스템 멈춤 현상이 발생. 생존한 에이전트는 가중치 업데이트를 받지 못하고 멈췄으며, 사망한 에이전트는 부활/사망의 무한 루프를 돌고 있었습니다.

#### Goal
에피소드 경계에서의 프리징 현상 해결.

#### Solution

* **근본 원인 분석**: 두 개의 충돌하는 에피소드 종료 시스템을 식별했습니다. Schola의 AutoResetType::SAME_STEP은 개별 에이전트 사망 시 자동 리셋을 트리거했으나, Python 측에서는 RLlib에서 혼합 궤적(mixed-trajectory) 배치가 생성되는 것을 방지하기 위해 모든 종료 신호를 억제하고 있었습니다. 이로 인해 사망한 에이전트가 '부활-사망' 무한 루프에 빠져 Schola의 모든 스텝 예산을 소모해 버렸습니다.

* **일관된 종료 의미론 적용**: IsEpisodeDone()이 MaxEpisodeSteps에서만 true를 반환하도록 수정했습니다. 이는 사망한 에이전트에 대해 이미 Running 상태를 반환하던 ComputeStatus()와 일관성을 맞춘 것으로, 이를 통해 Schola에서의 자동 리셋 루프를 중단시켰습니다.


#### Result
모든 에이전트가 에피소드 경계에서 동시에 종료되어, RLlib 후처리를 위한 깨끗한 단일 궤적 배치를 생성합니다.

[이미지: 프리징 시나리오를 보여주는 타임라인 다이어그램. 두 개의 수평 레인: "생존 에이전트"와 "사망 에이전트". 사망 에이전트 레인은 "사망 → 자동 리셋 → 사망 → 자동 리셋 → ..."의 급격한 사이클로 모든 스텝 예산을 소모하는 반면, 생존 에이전트 레인은 진전 없이 "대기 중..." 상태를 보임. "수정: 사망을 종료 조건에서 제거"라는 라벨이 붙은 화살표가 이 사이클을 끊음. 수정 후 두 레인 모두 "MaxEpisodeSteps → 에피소드 종료"까지 균일하게 진행됨.]



### Problem 4: 멀티 전략 환경에서의 협동
관측값에 아군의 전략도 포함되어있습니다. 그런데 전략 배치가 일정하지 않으면 학습이 수렴하지 않을 수 있기에 정해진 전략 배치 템플릿과 전략 분배를 통하여 각 전략당 33%씩 균등하게 학습되도록 했습니다 등등.




