* * *

### 개요 (Overview)

**PCSP(Persona-Conditioned Shared Policy)** 는 텍스트로 작성한 NPC 페르소나와 현재 게임 상태를 입력받아, 하나의 공유 강화학습 정책이 각 NPC의 다음 행동을 선택하는 대규모 시뮬레이션 프로젝트입니다. Python의 Mini-Inzoi 환경에서 Actor-Critic 정책을 학습하고 Actor를 ONNX로 내보낸 뒤, Unreal Engine 5.8에서 행동을 목적지 선택, 이동, 예약, 상호작용으로 연결했습니다. 대규모 실행 단계에서는 NPC별 `Character`, `AIController`, `Behavior Tree` 비용을 그대로 늘리는 대신 Mass Entity, 인스턴싱, 프레임 예산, 비동기 동적 배치를 사용했습니다.

핵심은 “1,024개의 모델”이 아니라 **하나의 정책 파라미터를 1,024 NPC가 공유하면서 관측, 페르소나, 욕구, 현재 의도와 실행 상태는 개별적으로 유지**하는 데 있습니다. 이 구조는 콘텐츠 확장과 실행 확장을 분리해 다룹니다. 페르소나를 추가할 때마다 별도 모델이나 성격별 분기 트리를 만들지 않되, 공유 모델 바깥에 남는 관측 생성, 이동, 상호작용, 애니메이션과 렌더링 비용은 별도의 시스템 문제로 측정했습니다.

<figure class="flex flex-col items-center my-8"><img src="/images/pcsp/fig1_mainview.png" alt="1,024 NPC가 동작하는 PCSP 도시 시뮬레이션 메인 화면" class="w-full rounded-lg shadow-md mb-2 modal-trigger cursor-pointer"><figcaption class="text-sm text-gray-500 italic font-sans text-center">Fig 1. 1,024개의 Mass NPC, 자연어 페르소나, 현재 행동과 집단 행동 분포를 함께 표시한 PCSP 메인 화면</figcaption></figure>

* * *

## 기술 스택 (Tech Stack)

| Category | Technologies |
| --- | --- |
| **Game / Runtime** | Unreal Engine 5.8, C++, Mass Entity, Mass Processor, NNE, ONNX |
| **Learning** | Python, PyTorch, PPO, GAE, FiLM, GRU, InfoNCE |
| **Persona** | Frozen Qwen3 1,024D embedding, learned rank-16 projection, 64D conditioning |
| **Execution** | Actor-Critic export, semantic action mapping, affordance zone, slot reservation |
| **Optimization** | SoA/ECS, HISM/ISM, AnimToTexture, dynamic batching, worker inference |
| **Validation** | Unreal Insights, fixed-condition benchmark, CSV/JSON telemetry, ablation study |

* * *

## 1. 개발 배경 및 문제 정의

### 대규모 NPC에서 개성과 비용이 함께 커지는 문제

라이프 시뮬레이션의 NPC는 식사, 휴식, 업무, 사회 활동처럼 공통된 행동 집합을 사용하지만, 같은 상황을 해석하는 우선순위는 성격에 따라 달라져야 합니다. 이를 모두 수작업 규칙으로 표현하면 성격과 상황의 조합이 늘어날수록 설계와 검증 비용이 증가합니다. 반대로 모든 NPC가 조건 없는 동일 정책을 사용하면 효율적인 몇 가지 행동으로 수렴해 개성이 약해질 수 있습니다.

<figure class="flex flex-col items-center my-8"><img src="/images/pcsp/fig2_bt.png" alt="NPC마다 별도 행동 트리를 관리하는 전통적 접근의 개념도" class="max-w-4xl rounded-lg shadow-md mb-2 modal-trigger cursor-pointer"><figcaption class="text-sm text-gray-500 italic font-sans text-center">Fig 2. 성격별 행동 우선순위를 개별 분기로 관리할 때 증가하는 저작·검증 비용</figcaption></figure>

PCSP가 해결하려는 문제는 다음 두 층으로 나뉩니다.

- **콘텐츠 확장:** NPC가 늘어날 때 별도 정책 모델이나 성격별 행동 우선순위 분기를 반복 작성하지 않습니다.
- **실행 확장:** 공유 정책을 사용하더라도 남아 있는 NPC별 상태, 추론 요청, 길찾기, 상호작용과 렌더링 비용을 제어합니다.
- **검증 가능성:** “성격다운 행동”과 “환경 보상이 높은 행동”을 같은 지표로 간주하지 않고 별도로 평가합니다.

Behavior Tree도 Blackboard 데이터에 따라 하나의 트리를 공유할 수 있습니다. 따라서 이 프로젝트의 차이는 “BT는 반드시 NPC마다 하나씩 필요하다”가 아니라, **성격별 행동 우선순위를 얼마나 수작업 분기로 작성하고 얼마나 학습된 조건부 정책으로 표현하는가**에 있습니다. BT와 규칙은 이동, 조건 검사, 예약, 상호작용처럼 결정 이후의 안정적인 실행에 계속 유효합니다.

* * *

## 2. 방법론과 전체 아키텍처

### Persona Encoding - Shared Policy - Semantic Action

<figure class="flex flex-col items-center my-8"><img src="/images/pcsp/fig3_architecture.png" alt="텍스트 페르소나, 관측, 공유 정책, UE 행동으로 이어지는 PCSP 아키텍처" class="w-full rounded-lg shadow-md mb-2 modal-trigger cursor-pointer"><figcaption class="text-sm text-gray-500 italic font-sans text-center">Fig 3. 텍스트 페르소나를 캐시된 64D 조건으로 만들고 33D 관측과 함께 공유 정책에 입력하는 구조</figcaption></figure>

페르소나 문장 임베딩은 매 결정마다 다시 계산하지 않습니다. 고정된 Qwen3 임베딩 모델로 1,024차원 표현을 얻고, 학습 가능한 두 선형 행렬을 이용해 64차원으로 투영한 뒤 정규화합니다.

<div class="project-math">e_p = \operatorname{Normalize}\!\left(W_B\,W_A\,z_p\right),\quad z_p\in\mathbb{R}^{1024},\; W_A\in\mathbb{R}^{16\times1024},\; W_B\in\mathbb{R}^{64\times16}</div>

코드의 행렬 이름은 `lora_A`, `lora_B`이지만, 언어 모델 본체에 LoRA 어댑터를 삽입해 미세조정하는 방식은 아닙니다. 이는 **고정 언어 임베딩 위의 학습 가능한 저랭크 투영**입니다. 런타임에는 이 결과를 NPC별로 캐시합니다.

정책의 계약은 다음과 같습니다.

<div class="project-math">\pi_\theta(a_t\mid o_t,e_p):\; \mathbb{R}^{33}\times\mathbb{R}^{64}\rightarrow\mathbb{R}^{20}</div>

- <span class="project-inline-math">o_t</span>: 위치, 시간, 8개 욕구, 시설과 주변·이력 맥락을 포함한 33차원 관측
- <span class="project-inline-math">e_p</span>: NPC에 고정된 64차원 페르소나 조건
- 출력: 20개 연구 액션의 정규화 전 점수(logits)
- 실행: 선택한 액션 ID를 UE의 semantic action, affordance category, zone과 interaction slot으로 매핑

모델 파라미터는 공유하지만 NPC별 입력과 실행 상태가 다르므로 행동 분포도 달라질 수 있습니다. 모델 공유는 NPC 상태 공유를 뜻하지 않습니다.

* * *

## 3. 왜 강화학습인가?

PCSP가 강화학습에 맡긴 부분은 행동 애니메이션 생성이 아니라 **반복되는 행동 선택의 우선순위**입니다. 일만 반복하면 Work 욕구는 회복되지만 Hunger, Sleep, Social 등 다른 욕구가 계속 감소합니다. 현재 선택이 다음 상태와 장기 누적 보상에 미치는 영향을 학습하면, 단일 규칙의 즉시 점수보다 긴 시간축의 균형을 다룰 수 있습니다.

<figure class="flex flex-col items-center my-8"><img src="/images/pcsp/fig4_systemflow.png" alt="관측, 페르소나, 정책, 행동, 다음 상태와 보상의 순환" class="w-full rounded-lg shadow-md mb-2 modal-trigger cursor-pointer"><figcaption class="text-sm text-gray-500 italic font-sans text-center">Fig 4. 현재 관측과 페르소나 조건에서 행동을 선택하고 다음 상태와 보상으로 학습하는 폐루프</figcaption></figure>

<div class="project-math">o_t,e_p\xrightarrow{\;\pi_\theta\;}a_t\xrightarrow{\;\text{environment}\;}(o_{t+1},r_t)</div>

| 접근 | 강점 | PCSP에서의 역할과 한계 |
| --- | --- | --- |
| **BT / 규칙 기반 AI** | 조건 검사와 실행 흐름이 명시적이고 안정적 | 이동·예약·상호작용 실행에 사용. 성격 조합별 우선순위를 세밀한 분기로 관리하면 저작 비용 증가 |
| **매 결정 LLM 호출** | 자연어 해석과 설명에 유연함 | 반복 실시간 결정에서는 호출 비용과 지연이 큼 |
| **페르소나 조건부 공유 RL** | 상황과 성격에 따른 우선순위를 데이터로 학습 | 행동 집합과 보상은 개발자가 정의해야 하며 일반화와 인간 평가가 필요 |

PPO를 사용했지만 다른 RL 알고리즘보다 이 문제에서 항상 우수하다는 비교 결과를 주장하지는 않습니다.

* * *

## 4. 학습 설정: 정책은 무엇을 보고 무엇을 선택하는가?

### 4.1 33차원 관측

아래는 Python `MiniInzoiV3Env._make_obs()`의 실제 인덱스 순서입니다. 모든 값은 고정 길이 텐서로 만들어집니다.

| Index | Dim | Meaning | Encoding |
| --- | ---: | --- | --- |
| 0-1 | 2 | 6x6 격자의 자기 위치 | `row/5`, `col/5` |
| 2 | 1 | 시각 | `time_of_day/23` |
| 3-10 | 8 | Hunger, Sleep, Social, Leisure, Hygiene, Fitness, Work, Learning | 0-1 충족 수준, 낮을수록 부족 |
| 11-18 | 8 | 가장 가까운 시설 | bed, kitchen, gym, library, desk, sofa, bathroom, park one-hot |
| 19 | 1 | 주변 타인 비율 | Chebyshev 거리 1 이내 수 / 4 |
| 20-21 | 2 | 직전 사회 행동 플래그 | 시작/응답 행동 여부 |
| 22-23 | 2 | 반복과 변경 이력 | `repeat_count/6`, `novelty_steps/20` |
| 24-32 | 9 | 다른 NPC 3명의 위치와 직전 행동 | 각각 row, col, action ID 정규화 |

총합은 <span class="project-inline-math">2+1+8+8+1+2+2+9=33</span>입니다. 이는 월드의 완전한 상태가 아닙니다. 시설까지의 실제 거리, 모든 이웃의 욕구나 성격, 임의 길이의 과거는 포함하지 않습니다.

### 4.2 20개 이산 행동과 UE 매핑

| ID | Python action | 상태 변화 | UE semantic action |
| ---: | --- | --- | --- |
| 0-1 | `focused_work`, `planning_work` | Work +0.05 | FocusedWork, PlanningWork |
| 2-3 | `eat_quick`, `eat_slow` | Hunger +0.05 / +0.08 | EatQuick, EatSlow |
| 4-5 | `sleep`, `nap` | Sleep +0.10 / +0.05 | RestAlone, RestWithOthers |
| 6-7 | `socialize_initiate`, `socialize_respond` | Social +0.07 | SocializeInitiate, SocializeRespond |
| 8-9 | `exercise_intense`, `exercise_light` | Fitness +0.08 / +0.04 | ExerciseSolo, ExerciseSocial |
| 10-11 | `read_deep`, `read_casual` | Learning +0.06 / Leisure +0.06 | DeepStudy, CasualLearning |
| 12-15 | `clean`, `rest_alone`, `rest_with_others`, `explore` | Hygiene / Leisure / Social 회복 | HygieneQuick, RestAlone, RestWithOthers, BrowseArea |
| 16-19 | 상·하·좌·우 이동 | 격자 위치 변경 | LeisureOutdoor / ObserveCrowd |

같은 범주의 행동도 스타일과 회복량이 다릅니다. 예를 들어 `eat_quick`과 `eat_slow`는 Hunger 회복량이 각각 0.05와 0.08입니다. 또한 Python의 행동 이름이 UE에서 목적지 도착이나 상호작용 완료를 자동 보장하지 않습니다. **logits - 선택 - UE 매핑 - 목적지 예약 - 실행 결과**는 구분해서 기록했습니다.

* * *

## 5. Reward는 Persona와 같지 않다

환경 보상만 높아져도 행동이 어떤 페르소나에서 생성됐는지 구분되지 않을 수 있습니다. PCSP는 생활 목표와 성향 적합성을 환경 보상으로 정의하는 동시에, 궤적-페르소나 정렬과 정책 분화를 학습 목적에서 별도로 다뤘습니다.

<figure class="flex flex-col items-center my-8"><img src="/images/pcsp/fig6_persona_comparison.png" alt="환경 보상과 페르소나 일관성을 분리한 학습 목표" class="w-full rounded-lg shadow-md mb-2 modal-trigger cursor-pointer"><figcaption class="text-sm text-gray-500 italic font-sans text-center">Fig 6. 생활 목표 보상만으로 부족한 페르소나 추적 가능성을 보조 손실로 분리</figcaption></figure>

### 5.1 환경 보상

<div class="project-math">r_t=r_{\mathrm{need}}+r_{\mathrm{critical}}+r_{\mathrm{preferred}}+r_{\mathrm{style}}+r_{\mathrm{social}}</div>

| 항 | 구현 | 의도 |
| --- | --- | --- |
| <span class="project-inline-math">r_{\mathrm{need}}</span> | 행동 후 욕구 상태와 회복량으로 계산 | 필요한 생활 활동 수행 |
| <span class="project-inline-math">r_{\mathrm{critical}}</span> | 행동 후 0.2 미만 욕구마다 -0.1 | 특정 욕구의 장기 방치 억제 |
| <span class="project-inline-math">r_{\mathrm{preferred}}</span> | 선호 액션이면 +0.5 | 페르소나별 활동 선호 반영 |
| <span class="project-inline-math">r_{\mathrm{style}}</span> | Big Five와 액션 스타일 cosine의 0.3배 | 행동 방식의 성향 정렬 |
| <span class="project-inline-math">r_{\mathrm{social}}</span> | 사회 행동에서 주변 NPC와 호환도 반영 | 사회적 맥락 고려 |

욕구 <span class="project-inline-math">n_k</span>에 행동 회복량 <span class="project-inline-math">d_k</span>를 적용하면 현재 복구 구현의 양의 항은 다음과 같습니다.

<div class="project-math">n'_k=\min(1,n_k+d_k),\qquad r_{\mathrm{need}}=\sum_k\min\!\left(d_k,\max(0,1-n'_k)\right)</div>

이후 한 cycle이 끝날 때 페르소나별 감소 배율을 적용합니다.

<div class="project-math">n_{t+1,k}=\operatorname{clip}\!\left(n'_{t,k}-\delta_k m_{p,k},0,1\right)</div>

선호 행동 보너스 0.5는 개별 회복량 0.03-0.10보다 큽니다. 따라서 정책이 항상 가장 부족한 욕구만 고른다고 단정할 수 없으며, 선호, 스타일, 부족 패널티와 미래 가치가 함께 영향을 줍니다.

### 5.2 Big Five 스타일과 사회적 호환성

스타일 벡터는 `E, N, A, C, O` 순서로 `low=-1`, `mid=0`, `high=1`을 사용합니다.

<div class="project-math">r_{\mathrm{style}}=0.3\,\cos\!\left(b_p,s_a\right)</div>

사회적 행동 ID 6, 7, 14는 주변 타인 한 명과의 별도 호환성 벡터를 사용합니다.

<div class="project-math">r_{\mathrm{social}}=0.2+0.3\,\cos\!\left(c_p,c_q\right)</div>

이 수치는 사람이 설계한 성격-행동 가정을 포함합니다. 보상 최적화만으로 실제 인간 성격을 재현했다고 해석하지 않았습니다.

* * *

## 6. 공유 Actor-Critic과 학습 목적

### 6.1 FiLM 조건부 정책

Actor는 `33 -> 256 -> 256 -> 128 -> 20`의 MLP이며 각 은닉 블록에서 페르소나 조건으로 scale과 shift를 생성합니다.

<div class="project-math">h'=\gamma(e_p)\odot h+\beta(e_p)</div>

같은 관측에서도 페르소나가 바뀌면 은닉 표현과 행동 확률이 바뀔 수 있습니다. Critic은 관측과 페르소나로 미래 누적 보상을 추정하며, UE 배포에는 Actor만 ONNX로 내보냅니다.

### 6.2 PPO, GAE와 clipped update

<div class="project-math">\hat A_t=\sum_{l=0}^{T-t-1}(\gamma\lambda)^l\delta_{t+l},\qquad \delta_t=r_t+\gamma V(s_{t+1})-V(s_t)</div>

<div class="project-math">L_{\mathrm{clip}}=\mathbb{E}_t\!\left[\min\!\left(\rho_t\hat A_t,\operatorname{clip}(\rho_t,1-\epsilon,1+\epsilon)\hat A_t\right)\right]</div>

기본 설정은 <span class="project-inline-math">\gamma=0.99</span>, GAE <span class="project-inline-math">\lambda=0.95</span>, clip <span class="project-inline-math">\epsilon=0.2</span>, entropy coefficient 0.01입니다.

### 6.3 궤적 일관성과 정책 다양성

2-layer GRU가 `(관측 33D, 액션 one-hot 20D)` 시퀀스를 64차원 궤적 표현으로 인코딩합니다. 배치의 올바른 궤적-페르소나 쌍을 대각선 positive로 두고 InfoNCE를 계산합니다.

<div class="project-math">L_{\mathrm{InfoNCE}}=-\frac{1}{B}\sum_{i=1}^{B}\log\frac{\exp(q_i^\top e_i/T)}{\sum_{j=1}^{B}\exp(q_i^\top e_j/T)}</div>

다양성 목적은 같은 관측에 서로 다른 페르소나를 넣었을 때 정책 분포 간 KL이 커지도록 합니다. 구현은 페르소나 쌍 <span class="project-inline-math">i&lt;j</span>에 대한 단방향 KL과 상한 2.0을 사용합니다.

<div class="project-math">L_{\mathrm{total}}=L_{\mathrm{PPO}}+\lambda_cL_{\mathrm{InfoNCE}}+\lambda_dL_{\mathrm{diversity}}</div>

InfoNCE는 Actor head를 직접 지도하지 않고 궤적 인코더와 공유 페르소나 투영을 직접 갱신합니다. Diversity는 Actor와 투영을 직접 갱신합니다. 따라서 “InfoNCE가 행동의 정답을 직접 제공한다”보다 “궤적 표현과 페르소나 표현의 정렬을 학습한다”가 정확합니다.

* * *

## 7. 학습 결과: 보상과 개성을 분리해 평가

<figure class="flex flex-col items-center my-8"><img src="/images/pcsp/fig7_training_result.png" alt="행동 다양성과 페르소나 일관성 학습 곡선 및 유형별 이동 경로" class="w-full rounded-lg shadow-md mb-2 modal-trigger cursor-pointer"><figcaption class="text-sm text-gray-500 italic font-sans text-center">Fig 7. 세 seed의 학습 신호와 UE에서 관찰한 페르소나 유형별 행동·이동 차이</figcaption></figure>

### 7.1 Unseen-occupation 제거 실험

학습 240개, 평가 60개 페르소나 조건에서 확인한 확정값입니다. 무작위 식별 기준은 약 1.7%입니다.

| Condition | 환경 보상 ↑ | 내부 페르소나 식별 ↑ | Coherence ↑ |
| --- | ---: | ---: | ---: |
| Full PCSP, FiLM | 104.1 | 17.0% | 2.06 |
| InfoNCE 제거 | 118.4 | 1.7% | 1.07 |
| Diversity 제거 | 122.1 | 16.0% | 2.05 |
| Concat 조건화 | 107.0 | 28.3% | 7.60 |

InfoNCE를 제거하면 환경 보상은 높아졌지만 내부 식별이 무작위 수준으로 감소했습니다. 이는 생활 목표 수행과 학습된 표현의 페르소나 추적 가능성이 서로 다른 평가 축임을 보여줍니다. 내부 식별과 Coherence는 학습된 궤적 인코더를 사용하므로 인간 평가 점수가 아닙니다.

### 7.2 독립 행동 평가와 인간 파일럿

v3-large에서 정책 logits나 학습된 궤적 인코더를 쓰지 않는 독립 평가도 수행했습니다.

| 평균 Big Five balanced accuracy | Full | InfoNCE 제거 |
| --- | ---: | ---: |
| 행동 통계만 사용 | 0.482 | 0.511 |
| 상태와 상태별 행동 반응 포함 | 0.556 | 0.558 |

이 평가에서는 InfoNCE의 행동적 우위를 확인하지 못했습니다. 그래서 성과를 “학습된 궤적-페르소나 표현 정렬에 기여”로 제한했습니다. 별도의 30명 coarse-trace 2지선다 파일럿에서는 900개 집계 응답 중 612개가 정답으로 **68.0%**를 기록했습니다. 이는 일부 행동 차이를 사람이 읽을 수 있다는 근거지만, 현재 UE 화면의 자연스러움이나 모든 Big Five 특성을 입증하는 결과는 아닙니다.

* * *

## 8. 실행 구조 최적화: Actor에서 Mass로

정책 자체보다 개별 Actor, 경로 요청, 애니메이션과 렌더 프록시가 먼저 병목이 되었습니다. 과거 Actor 기준선에서는 NPC 64 / 96 / 128명에서 이동 실패율이 각각 0.2% / 4.7% / 44.9%까지 증가했습니다. 당시 ONNX 호출은 약 0.13-0.20 ms였지만 동시 경로 요청이 실행 신뢰성을 저해했습니다.

<figure class="flex flex-col items-center my-8"><img src="/images/pcsp/fig8_npcincerasing.png" alt="Mass NPC 증가에 따른 프레임 비용, 정책 서비스 시간, 도착 처리량" class="w-full rounded-lg shadow-md mb-2 modal-trigger cursor-pointer"><figcaption class="text-sm text-gray-500 italic font-sans text-center">Fig 8. NPC 수가 증가해도 의사결정 1회당 정책 서비스 시간과 NPC당 도착 처리량이 유지되는지 분리 측정</figcaption></figure>

<figure class="flex flex-col items-center my-8"><img src="/images/pcsp/fig9_actor_mass_comparison.png" alt="Actor와 Mass 실행 구조의 프레임 비용 비교" class="w-full rounded-lg shadow-md mb-2 modal-trigger cursor-pointer"><figcaption class="text-sm text-gray-500 italic font-sans text-center">Fig 9. 과거 Actor + PCSP와 Mass + PCSP의 진단 프레임 비용 비교</figcaption></figure>

Mass 경로에서는 페르소나 ID, 욕구, 의도, transform, 목적지와 제한된 이력을 Fragment로 관리하고 Processor가 묶어서 처리합니다. 의사결정 cohort와 프레임별 예산으로 추론 요청을 분산하고, Zone capacity와 실제 interaction slot 예약을 연결했습니다.

### 확정 All-Mass 스케일링 결과

| Mass NPC | Frame mean (ms) | Window p95 집계 (ms) | Mass 도착/NPC/분 |
| ---: | ---: | ---: | ---: |
| 128 | 26.21 ± 0.07 | 29.16 ± 0.24 | 4.66 ± 0.11 |
| 256 | 26.53 ± 0.15 | 29.68 ± 0.34 | 4.63 ± 0.09 |
| 512 | 27.23 ± 0.07 | 31.02 ± 0.02 | 4.61 ± 0.09 |
| 1,024 | 28.42 ± 0.17 | 34.14 ± 0.11 | 4.76 ± 0.06 |

측정은 2026-09-02, UE 5.8 visible standalone 800x450, 정적 Manny LOD1 HISM과 Zone 수준 이동 조건에서 수행했습니다. 각 NPC 수마다 seed 0/1/2, 총 12개 실행을 사용했고 60초 중 초기 5초를 제외했습니다. 128명에서 1,024명으로 8배 증가할 때 평균 프레임 비용은 2.21 ms 증가했고 NPC당 도착 처리량은 약 4.6-4.8회/분을 유지했습니다.

28.42 ms는 평균 약 35.2 FPS에 해당하지만 60 FPS 달성이나 모든 프레임의 30 FPS 이상을 보장하지 않습니다. 또한 Fig 9의 최대 4.96배는 서로 다른 실행 표현과 이동 조건을 포함한 진단 비교이므로 순수한 BT 제거 효과로 해석하지 않았습니다.

* * *

## 9. 렌더링 최적화: 표현 단위를 다시 설계

NPC마다 SkeletalMesh, AnimBP와 렌더 프록시를 생성하면 시뮬레이션 로직과 별개로 비용이 선형 증가합니다. 개별 Skeletal Component를 제거하고 Idle/Walk 애니메이션을 AnimToTexture 데이터로 재생하며, 인스턴스별 phase와 velocity만 custom data로 전달했습니다. 근거리는 매 프레임, 중거리와 원거리는 각각 0.06초와 0.15초 간격으로 갱신하고 300 m 밖의 표현은 컬링합니다.

<figure class="flex flex-col items-center my-8"><img src="/images/pcsp/fig10_rendering-optimization-comparison.png" alt="Skeletal 표현과 인스턴싱 렌더 파이프라인 비교" class="w-full rounded-lg shadow-md mb-2 modal-trigger cursor-pointer"><figcaption class="text-sm text-gray-500 italic font-sans text-center">Fig 10. Per-NPC skeletal, shared leader pose, Manny 인스턴싱을 비교해 선택한 VAT + ISM 파이프라인</figcaption></figure>

진단 smoke에서 Per-NPC skeletal 234.14 ms 대비 Manny LOD1 instanced가 114.54 ms로 **51.1% 낮았습니다**. 다만 이는 특정 진단 장면의 평균 프레임 비용이며 현재 도시 전체의 일반적인 GPU 개선율은 아닙니다. 포즈 계산을 공유하는 것과 렌더 객체를 공유하는 것은 다른 최적화입니다.

* * *

## 10. Unreal Insights로 실루엣 비용 확인

단순 cylinder와 Manny LOD1 인스턴스의 BasePass 누적 시간을 같은 방식으로 비교했습니다. 캐릭터 실루엣과 버텍스 속성을 복원하는 비용을 분리해, 더미 메시에서 얻은 프레임 수치가 실제 캐릭터 표현에서도 유지되는지 확인했습니다.

<div class="grid grid-cols-1 md:grid-cols-2 gap-6 my-8 items-start"><figure class="flex flex-col items-center"><img src="/images/pcsp/fig11_cylinder.png" alt="Cylinder 객체 Unreal Insights 캡처" class="w-full rounded-lg shadow-md mb-2 modal-trigger cursor-pointer"><figcaption class="text-sm text-gray-500 italic font-sans text-center">Fig 11. 단순 cylinder 인스턴스의 BasePass 측정: 약 13.20 ms</figcaption></figure><figure class="flex flex-col items-center"><img src="/images/pcsp/fig12_manny.png" alt="Manny 객체 Unreal Insights 캡처" class="w-full rounded-lg shadow-md mb-2 modal-trigger cursor-pointer"><figcaption class="text-sm text-gray-500 italic font-sans text-center">Fig 12. Manny LOD1 인스턴스의 BasePass 측정: 약 32.73 ms</figcaption></figure></div>

Manny 적용으로 whole-frame 비용은 더미 메시 대비 약 2.70 ms 증가했습니다. 이 비교를 통해 CPU 애니메이션 제거만으로 충분하지 않으며 vertex 수, material, shadow, draw submission과 VRAM을 포함한 GPU 검증이 별도로 필요하다는 점을 확인했습니다. 큰 텍스처 24개는 최대 2,048로 제한했지만 애니메이션 데이터 텍스처에는 동일한 축소를 적용하지 않았습니다.

* * *

## 11. 정책 추론 비동기화와 Game Thread 경계

UObject를 worker에서 직접 접근하지 않고, Game Thread에서 stable ID와 관측·페르소나를 POD 스냅샷으로 복사합니다. worker는 전용 NNE model instance로 최대 32개 입력을 동적 배치하고, 완료 결과는 다음 Game Thread 단계에서 stable ID를 통해 커밋합니다. Game Thread는 future를 기다리지 않습니다.

<figure class="flex flex-col items-center my-8"><img src="/images/pcsp/fig13_multithread_optimization.png" alt="공간 질의와 ONNX 추론을 worker로 이동한 멀티스레딩 결과" class="w-full rounded-lg shadow-md mb-2 modal-trigger cursor-pointer"><figcaption class="text-sm text-gray-500 italic font-sans text-center">Fig 13. POD snapshot, 동적 배치, non-blocking commit으로 제한된 작업만 Game Thread 밖으로 이동</figcaption></figure>

- 128 Actor, 30초 x 3 seed의 snapshot + uniform grid pilot에서 대상 공간 탐색 GT 비용: **637.85 -> 85.90 ms/30초**, 약 86.4% 감소
- 16 Actor + 1,008 Mass pilot의 ONNX 관련 GT 비용: **1.142 -> 0.045 ms/frame**, 약 96.1% 감소
- 별도 worker 추론 비용: 약 0.978 ms/frame
- 같은 pilot의 결정 처리량 -0.6%, 도착 처리량 -0.3%

96.1%는 전체 계산량이나 전체 FPS의 개선율이 아니라 **계측한 ONNX 관련 Game Thread 구간**의 감소입니다. Mass Processor 전체가 자동으로 병렬 실행된다는 뜻도 아닙니다. 현재 시뮬레이션 Processor는 Game Thread를 요구하며 비동기 추론 경로는 opt-in으로 관리합니다.

* * *

## 12. 런타임에서 페르소나와 행동 연결 확인

<figure class="flex flex-col items-center my-8"><img src="/images/pcsp/fig14_live-persona-source.png" alt="두 NPC의 페르소나와 최근 의사결정을 비교하는 HUD" class="w-full rounded-lg shadow-md mb-2 modal-trigger cursor-pointer"><figcaption class="text-sm text-gray-500 italic font-sans text-center">Fig 14. 선택 NPC와 Pin 비교 NPC의 자연어 페르소나, 현재 행동, 목적지와 최근 의사결정 기록</figcaption></figure>

HUD는 stable entity를 선택해 Persona ID, 이름, 직업, 나이와 성격 문장을 표시합니다. `NOW`에는 현재 semantic action, 이동/상호작용 상태, 목적지와 남은 거리를 연결하고, recent history에는 시간순 결정 샘플을 보존합니다. Pin 기능은 다른 NPC의 과거 시점 스냅샷을 고정해 같은 화면에서 비교합니다.

Fig 14의 선택 NPC는 `SocializeInitiate` 뒤에 `HygieneQuick`을 선택했고, 비교 NPC에는 `RestAlone` 반복이 기록되어 있습니다. 이는 서로 다른 결정 이력을 표시하는 실제 사례지만, 두 NPC의 욕구, 위치와 시점도 다르므로 한 장만으로 차이의 원인이 페르소나라고 단정하지 않습니다. 인과 효과는 같은 관측에서 페르소나 벡터만 바꾸는 고정 입력 비교와 통제된 rollout으로 별도 평가해야 합니다.

* * *

## 13. 재현 가능한 런타임 성능 검증 도구

<figure class="flex flex-col items-center my-8"><img src="/images/pcsp/fig15_live-performance-source.png" alt="FPS, CPU, 정책 지연과 처리량을 비교하는 런타임 도구" class="w-full rounded-lg shadow-md mb-2 modal-trigger cursor-pointer"><figcaption class="text-sm text-gray-500 italic font-sans text-center">Fig 15. Persona effect, 실행 구조, 추론 방식의 세 축을 분리하는 런타임 성능 패널</figcaption></figure>

성능 비교는 `Fresh World -> Warm-up -> Record -> Validate` 순서로 자동화했습니다.

1. 각 variant를 같은 NPC 수, seed, 시작 상태와 카메라로 재시작합니다.
2. 전체 population 준비 후 초기 5초를 측정에서 제외합니다.
3. 30초 동안 CPU, FPS, decision, arrival, policy latency를 수집합니다.
4. 카메라, 해상도, 완료 여부 등 조건을 검사하고 CSV/JSON으로 저장합니다.

비교 축도 의도적으로 분리했습니다.

| Axis | Variants | 질문 |
| --- | --- | --- |
| Persona effect | PCSP / Needs heuristic / No Persona | 행동 분포 변화와 추가 결정 비용은 얼마인가? |
| Execution | Actor + BT / Mass | 전체 실행 구조의 비용과 처리량은 어떻게 다른가? |
| Inference | synchronous / worker batch | 추론 서비스 시간, 결과 지연과 처리량은 보존되는가? |

`No Persona`는 같은 정책의 페르소나 벡터를 0으로 만드는 입력 제거 실험이며 처음부터 별도로 학습한 무페르소나 모델은 아닙니다. `Needs heuristic`도 NPC마다 BT를 실행하는 기준선과는 다릅니다.

* * *

## 14. “왜 이 행동인가?”를 시간순으로 추적

<figure class="flex flex-col items-center my-8"><img src="/images/pcsp/fig16_why-action-source.png" alt="욕구, 페르소나, 관측, 정책과 월드 결과를 연결한 HUD" class="w-full rounded-lg shadow-md mb-2 modal-trigger cursor-pointer"><figcaption class="text-sm text-gray-500 italic font-sans text-center">Fig 16. Persona + Needs -> 33D Observation -> PCSP Policy -> Action + World Result의 추적 경로</figcaption></figure>

정책 출력만 기록하면 모델이 무엇을 보고 선택했는지, 선택이 실제 완료됐는지 알 수 없습니다. 그래서 한 NPC의 stable ID를 기준으로 다음 정보를 연결했습니다.

- 고정 성격 데이터와 시시각각 변하는 8개 욕구
- 33개 observation field와 원래 `policy_action_index`
- 매핑된 UE semantic action과 20-action logits
- affordance category, 선택 zone, slot reservation
- 이동, 도착, 상호작용 시작·완료 및 실패 결과

### Python과 UE의 33D 의미 차이

입출력 차원과 연구 액션 인덱스는 유지했지만 모든 관측 의미가 동일하지는 않습니다.

| Field | Python v3 base | UE Mass | 검증 영향 |
| --- | --- | --- | --- |
| 위치 | 6x6 row/col | district 내 연속 X/Y | 분포와 공간 의미 차이 |
| 시간 | 정수 시각 / 23 | 600초 연속 phase | 표본 분포 차이 |
| 11-18 | 가장 가까운 시설 one-hot | 직전 Intent category | 기준과 enum 순서 차이 |
| 19 | 주변 수 / 4 | local grid 수 / live population | 규모에 따른 분포 차이 |
| 20-23 | 연구 액션의 사회·반복 신호 | 매핑된 UE 행동 이력 | 합쳐진 액션의 의미 차이 |
| 24-32 | 다른 NPC 3명 정보 | 현재 zero padding | 이웃별 정보 소실 |

따라서 “정책 I/O 형태를 유지했다”는 주장과 “Python/UE의 상태 의미가 완전히 같다”는 주장을 구분합니다. 고정 입력 replay는 동기/worker 경로의 logits 최대 절대 오차 0.001을 검증하지만, 관측 의미나 장시간 행동 궤적의 동등성까지 증명하지는 않습니다.

* * *

## 15. 1,024개 행동을 도시의 장소로 연결

정책의 20개 연구 액션을 화면 속 행동으로 만들기 위해 도시를 16개 district, 118개 affordance zone, 1,704개 interaction slot으로 구성했습니다. Zone은 11개 행동 category의 목적지를 제공하고, slot은 위치, capacity, 예약 상태와 duration을 관리합니다.

<div class="grid grid-cols-1 md:grid-cols-2 gap-6 my-8 items-start"><figure class="flex flex-col items-center"><img src="/images/pcsp/fig17_dieselpunk-city-affordances.png" alt="도시의 affordance zone과 interaction slot" class="w-full rounded-lg shadow-md mb-2 modal-trigger cursor-pointer"><figcaption class="text-sm text-gray-500 italic font-sans text-center">Fig 17. 16개 district에 배치한 행동 목적지와 interaction slot</figcaption></figure><figure class="flex flex-col items-center"><img src="/images/pcsp/fig18_live_npc_routes.png" alt="도시에서 이동하고 상호작용하는 NPC 경로" class="w-full rounded-lg shadow-md mb-2 modal-trigger cursor-pointer"><figcaption class="text-sm text-gray-500 italic font-sans text-center">Fig 18. 정책 결정을 zone 선택, 이동, 예약과 도착 기록으로 연결한 live NPC routes</figcaption></figure></div>

Mass population은 district에 결정적으로 분산되고, 정책 출력은 affordance category를 거쳐 가능한 zone과 slot으로 연결됩니다. 논리 capacity뿐 아니라 실제 슬롯 예약을 사용해 여러 NPC가 같은 목적지를 선택했을 때의 경쟁과 완료 상태를 추적합니다.

* * *

## 결과와 해석 범위

- 텍스트 페르소나를 64D 조건으로 변환해 하나의 공유 Actor가 33D 상태에서 20개 행동의 우선순위를 선택하도록 구현했습니다.
- PPO, FiLM, InfoNCE 궤적 정렬과 KL 기반 정책 분화를 하나의 학습 파이프라인으로 구성했습니다.
- 환경 보상, 내부 표현 정렬, 독립 행동 통계와 인간 파일럿을 분리해 평가했습니다.
- UE5 Mass, affordance slot, 인스턴싱과 비동기 배치 추론을 결합해 특정 All-Mass 조건에서 1,024 NPC 스케일링을 확인했습니다.
- 고정 조건, warm-up 제외, 다중 seed, CSV/JSON 추출을 포함한 재현 가능한 검증 도구를 구축했습니다.

현재 결과는 “도시 데모가 1,024명에서 60 FPS로 검증됐다”거나 “96.1%만큼 전체 FPS가 향상됐다”는 뜻이 아닙니다. 또한 Python과 UE의 관측 의미 정합성, 새 도시 맵의 Shipping 성능, 장시간 행동 품질은 후속 검증 항목으로 남겨 두었습니다. PCSP의 핵심 성과는 모델 하나만 만든 것이 아니라, **학습된 의사결정을 실제 대규모 게임 월드에서 실행하고 그 주장 범위를 계측 가능한 단위로 분리한 것**입니다.
