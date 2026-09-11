* * *

### Overview

**PCSP (Persona-Conditioned Shared Policy)** is a large-scale simulation in which one reinforcement-learning policy chooses each NPC's next action from a text persona and the current game state. I trained an Actor-Critic policy in the Python Mini-Inzoi environment, exported the Actor to ONNX, and connected its decisions to destination selection, movement, reservation, and interaction in Unreal Engine 5.8. At scale, the runtime replaces per-NPC `Character`, `AIController`, and `Behavior Tree` overhead with Mass Entity processing, instanced rendering, frame budgets, and asynchronous dynamic-batch inference.

The central idea is not to create 1,024 models. **All 1,024 NPCs share one set of policy parameters while retaining separate observations, personas, needs, intentions, and execution states.** The project therefore treats content scalability and execution scalability as related but distinct problems: sharing a model reduces per-persona authoring, while observation building, navigation, interaction, animation, and rendering still require explicit systems engineering and measurement.

<figure class="flex flex-col items-center my-8"><img src="/images/pcsp/fig1_mainview.png" alt="Main PCSP city simulation with 1,024 NPCs" class="w-full rounded-lg shadow-md mb-2 modal-trigger cursor-pointer"><figcaption class="text-sm text-gray-500 italic font-sans text-center">Fig 1. PCSP main view showing 1,024 Mass NPCs, natural-language personas, current actions, and the population action distribution</figcaption></figure>

* * *

## Tech Stack

| Category | Technologies |
| --- | --- |
| **Game / Runtime** | Unreal Engine 5.8, C++, Mass Entity, Mass Processor, NNE, ONNX |
| **Learning** | Python, PyTorch, PPO, GAE, FiLM, GRU, InfoNCE |
| **Persona** | Frozen Qwen3 1,024D embedding, learned rank-16 projection, 64D conditioning |
| **Execution** | Actor-Critic export, semantic action mapping, affordance zones, slot reservation |
| **Optimization** | SoA/ECS, HISM/ISM, AnimToTexture, dynamic batching, worker inference |
| **Validation** | Unreal Insights, fixed-condition benchmarks, CSV/JSON telemetry, ablation studies |

* * *

## 1. Background and Problem Definition

### Scaling personality without scaling hand-authored branches

NPCs in a life simulation share broad activities such as eating, resting, working, learning, and socializing, but their priorities should differ with personality. Encoding every personality-situation combination as hand-authored rules increases design and verification cost. At the other extreme, an unconditional shared policy can converge to a few efficient behaviors and suppress the differences the system is meant to express.

<figure class="flex flex-col items-center my-8"><img src="/images/pcsp/fig2_bt.png" alt="Conceptual diagram of maintaining separate behavior logic for many NPCs" class="max-w-4xl rounded-lg shadow-md mb-2 modal-trigger cursor-pointer"><figcaption class="text-sm text-gray-500 italic font-sans text-center">Fig 2. Authoring and verification cost grows when personality-specific priorities are maintained as separate branches</figcaption></figure>

PCSP separates the problem into three concerns:

- **Content scalability:** adding an NPC does not require a separate policy model or a new tree of personality-specific priorities.
- **Execution scalability:** per-NPC state, inference requests, path finding, interactions, animation, and rendering must still be budgeted.
- **Evaluation:** behavior that earns high environment reward is not automatically behavior that remains attributable to its persona.

A Behavior Tree can also be shared and parameterized through Blackboard data. The relevant distinction is therefore not that BTs always require one tree per NPC. It is **how much of the personality-conditioned priority structure is hand-authored and how much is represented by a learned conditional policy**. PCSP still uses deterministic engine logic for movement, condition checks, reservation, and interaction after a decision has been made.

* * *

## 2. Methodology and Architecture

### Persona Encoding - Shared Policy - Semantic Action

<figure class="flex flex-col items-center my-8"><img src="/images/pcsp/fig3_architecture.png" alt="PCSP architecture from persona text and observation to a shared policy and UE actions" class="w-full rounded-lg shadow-md mb-2 modal-trigger cursor-pointer"><figcaption class="text-sm text-gray-500 italic font-sans text-center">Fig 3. A cached 64D persona condition and a 33D observation feed one shared policy</figcaption></figure>

The runtime does not re-encode persona text on every decision. A frozen Qwen3 encoder produces a 1,024-dimensional representation, after which two learned linear matrices project it to 64 dimensions and normalize it.

<div class="project-math">e_p = \operatorname{Normalize}\!\left(W_B\,W_A\,z_p\right),\quad z_p\in\mathbb{R}^{1024},\; W_A\in\mathbb{R}^{16\times1024},\; W_B\in\mathbb{R}^{64\times16}</div>

The matrices are named `lora_A` and `lora_B` in the implementation, but they do not insert a LoRA adapter into the language model. They form a **learned low-rank projection on top of a frozen language embedding**. The projected vector is cached per persona for runtime use.

The policy contract is:

<div class="project-math">\pi_\theta(a_t\mid o_t,e_p):\; \mathbb{R}^{33}\times\mathbb{R}^{64}\rightarrow\mathbb{R}^{20}</div>

- <span class="project-inline-math">o_t</span>: a 33D observation containing position, time, eight needs, facility context, nearby agents, and short history signals
- <span class="project-inline-math">e_p</span>: a fixed 64D persona condition for the NPC
- Output: unnormalized logits for 20 research actions
- Execution: the selected research action maps to a UE semantic action, affordance category, zone, and interaction slot

Policy parameters are shared; agent inputs and execution state are not. Different observations and persona conditions can therefore yield different action distributions from the same model.

* * *

## 3. Why Reinforcement Learning?

Reinforcement learning is used for **repeated action prioritization**, not automatic generation of arbitrary animations or game logic. Repeating work may replenish the Work need while Hunger, Sleep, and Social continue to decay. Learning from cumulative reward lets the policy account for how a current choice changes later state instead of relying only on an immediate rule score.

<figure class="flex flex-col items-center my-8"><img src="/images/pcsp/fig4_systemflow.png" alt="Closed loop from observation and persona to action, next state, and reward" class="w-full rounded-lg shadow-md mb-2 modal-trigger cursor-pointer"><figcaption class="text-sm text-gray-500 italic font-sans text-center">Fig 4. Closed-loop learning from the current observation and persona condition to the next state and reward</figcaption></figure>

<div class="project-math">o_t,e_p\xrightarrow{\;\pi_\theta\;}a_t\xrightarrow{\;\text{environment}\;}(o_{t+1},r_t)</div>

| Approach | Strength | Role and limitation in PCSP |
| --- | --- | --- |
| **BT / rule-based AI** | Explicit, reliable condition and execution flow | Used for movement, reservation, and interaction. Fine-grained personality priorities increase authoring cost |
| **LLM call per decision** | Flexible natural-language interpretation and explanation | Too expensive and latent for a repeated real-time decision path |
| **Persona-conditioned shared RL** | Learns state- and persona-dependent priorities from data | Requires a designed action space, reward, generalization tests, and behavioral evaluation |

PPO is the algorithm used by this implementation; the project does not claim that PPO was proven optimal against every alternative RL algorithm.

* * *

## 4. Learning Setup: What Does the Policy Observe and Select?

### 4.1 The complete 33D observation

The table follows the actual index order in `MiniInzoiV3Env._make_obs()`.

| Index | Dim | Meaning | Encoding |
| --- | ---: | --- | --- |
| 0-1 | 2 | Own position on a 6x6 grid | `row/5`, `col/5` |
| 2 | 1 | Time | `time_of_day/23` |
| 3-10 | 8 | Hunger, Sleep, Social, Leisure, Hygiene, Fitness, Work, Learning | Satisfaction in 0-1; lower means more depleted |
| 11-18 | 8 | Nearest facility | one-hot for bed, kitchen, gym, library, desk, sofa, bathroom, park |
| 19 | 1 | Nearby-agent ratio | count within Chebyshev distance 1, divided by 4 |
| 20-21 | 2 | Previous social-action flags | initiated/responded signal |
| 22-23 | 2 | Repetition and action-change history | `repeat_count/6`, `novelty_steps/20` |
| 24-32 | 9 | Position and previous action of three other agents | normalized row, column, and action ID for each |

The total is <span class="project-inline-math">2+1+8+8+1+2+2+9=33</span>. This is not a complete world state: it does not contain exact facility distance, every neighbor's needs or personality, or an unbounded action history.

### 4.2 Twenty discrete research actions and UE mappings

| ID | Python action | State update | UE semantic action |
| ---: | --- | --- | --- |
| 0-1 | `focused_work`, `planning_work` | Work +0.05 | FocusedWork, PlanningWork |
| 2-3 | `eat_quick`, `eat_slow` | Hunger +0.05 / +0.08 | EatQuick, EatSlow |
| 4-5 | `sleep`, `nap` | Sleep +0.10 / +0.05 | RestAlone, RestWithOthers |
| 6-7 | `socialize_initiate`, `socialize_respond` | Social +0.07 | SocializeInitiate, SocializeRespond |
| 8-9 | `exercise_intense`, `exercise_light` | Fitness +0.08 / +0.04 | ExerciseSolo, ExerciseSocial |
| 10-11 | `read_deep`, `read_casual` | Learning +0.06 / Leisure +0.06 | DeepStudy, CasualLearning |
| 12-15 | `clean`, `rest_alone`, `rest_with_others`, `explore` | Hygiene / Leisure / Social recovery | HygieneQuick, RestAlone, RestWithOthers, BrowseArea |
| 16-19 | grid movement | changes grid position | LeisureOutdoor / ObserveCrowd |

Actions within the same broad category can differ in style and recovery. For example, `eat_quick` and `eat_slow` restore 0.05 and 0.08 Hunger respectively. A Python action name also does not guarantee a successful UE arrival or interaction. **Logits, sampling, UE mapping, destination reservation, and the execution result are recorded as separate stages.**

* * *

## 5. Reward Is Not Persona

High environment reward does not guarantee that a trajectory remains attributable to its generating persona. PCSP defines life-task and preference signals as environment reward while treating trajectory-persona alignment and policy separation as additional training objectives.

<figure class="flex flex-col items-center my-8"><img src="/images/pcsp/fig6_persona_comparison.png" alt="Separation of life-task reward and persona consistency objectives" class="w-full rounded-lg shadow-md mb-2 modal-trigger cursor-pointer"><figcaption class="text-sm text-gray-500 italic font-sans text-center">Fig 6. Persona traceability is optimized separately from the environment reward for maintaining daily life</figcaption></figure>

### 5.1 Environment reward

<div class="project-math">r_t=r_{\mathrm{need}}+r_{\mathrm{critical}}+r_{\mathrm{preferred}}+r_{\mathrm{style}}+r_{\mathrm{social}}</div>

| Term | Implementation | Purpose |
| --- | --- | --- |
| <span class="project-inline-math">r_{\mathrm{need}}</span> | uses post-action need state and recovery amount | perform currently useful life activities |
| <span class="project-inline-math">r_{\mathrm{critical}}</span> | -0.1 for every post-action need below 0.2 | discourage prolonged neglect |
| <span class="project-inline-math">r_{\mathrm{preferred}}</span> | +0.5 when action ID belongs to the persona's preference set | encode activity preference |
| <span class="project-inline-math">r_{\mathrm{style}}</span> | 0.3 times the cosine between Big Five and action style | align how an activity is performed |
| <span class="project-inline-math">r_{\mathrm{social}}</span> | compatibility with one nearby NPC for social actions | include social context |

For a need <span class="project-inline-math">n_k</span> and recovery <span class="project-inline-math">d_k</span>, the recovered reference implementation computes:

<div class="project-math">n'_k=\min(1,n_k+d_k),\qquad r_{\mathrm{need}}=\sum_k\min\!\left(d_k,\max(0,1-n'_k)\right)</div>

Persona-specific decay is applied at the end of a full agent cycle:

<div class="project-math">n_{t+1,k}=\operatorname{clip}\!\left(n'_{t,k}-\delta_k m_{p,k},0,1\right)</div>

The +0.5 preference bonus is larger than any individual recovery amount of 0.03-0.10. The policy should therefore not be described as always choosing the most depleted need; preference, style, critical penalties, and future value all influence selection.

### 5.2 Big Five style and social compatibility

Action style uses Big Five axes in `E, N, A, C, O` order and encodes `low=-1`, `mid=0`, and `high=1`.

<div class="project-math">r_{\mathrm{style}}=0.3\,\cos\!\left(b_p,s_a\right)</div>

Social action IDs 6, 7, and 14 use a separate compatibility vector for one nearby agent:

<div class="project-math">r_{\mathrm{social}}=0.2+0.3\,\cos\!\left(c_p,c_q\right)</div>

These terms encode human-authored assumptions about personality and action style. Optimizing them is not evidence that the policy reproduces human personality in every respect.

* * *

## 6. Shared Actor-Critic and Training Objectives

### 6.1 FiLM-conditioned policy

The Actor is a `33 -> 256 -> 256 -> 128 -> 20` MLP. Each hidden block derives a scale and shift from the persona condition.

<div class="project-math">h'=\gamma(e_p)\odot h+\beta(e_p)</div>

Changing only the persona can therefore change the hidden representation and action probabilities for the same observation. The Critic estimates future return from observation and persona; only the Actor is exported to the UE runtime.

### 6.2 PPO, GAE, and clipped updates

<div class="project-math">\hat A_t=\sum_{l=0}^{T-t-1}(\gamma\lambda)^l\delta_{t+l},\qquad \delta_t=r_t+\gamma V(s_{t+1})-V(s_t)</div>

<div class="project-math">L_{\mathrm{clip}}=\mathbb{E}_t\!\left[\min\!\left(\rho_t\hat A_t,\operatorname{clip}(\rho_t,1-\epsilon,1+\epsilon)\hat A_t\right)\right]</div>

Default settings include <span class="project-inline-math">\gamma=0.99</span>, GAE <span class="project-inline-math">\lambda=0.95</span>, clip <span class="project-inline-math">\epsilon=0.2</span>, and entropy coefficient 0.01.

### 6.3 Trajectory consistency and policy diversity

A two-layer GRU converts a sequence of `(33D observation, 20D action one-hot)` pairs into a 64D trajectory embedding. InfoNCE treats the matching trajectory-persona pair on the batch diagonal as positive.

<div class="project-math">L_{\mathrm{InfoNCE}}=-\frac{1}{B}\sum_{i=1}^{B}\log\frac{\exp(q_i^\top e_i/T)}{\sum_{j=1}^{B}\exp(q_i^\top e_j/T)}</div>

The diversity objective evaluates different personas on the same observations and increases pairwise policy KL. The implementation uses one-directional KL for persona pairs <span class="project-inline-math">i&lt;j</span>, capped at 2.0.

<div class="project-math">L_{\mathrm{total}}=L_{\mathrm{PPO}}+\lambda_cL_{\mathrm{InfoNCE}}+\lambda_dL_{\mathrm{diversity}}</div>

InfoNCE directly updates the trajectory encoder and shared persona projection, not the Actor head. Diversity directly updates the Actor and projection. Thus, InfoNCE aligns learned trajectory and persona representations; it does not provide a direct supervised label for the correct action.

* * *

## 7. Training Results: Evaluating Reward and Persona Separately

<figure class="flex flex-col items-center my-8"><img src="/images/pcsp/fig7_training_result.png" alt="Behavior diversity, persona consistency curves, and example persona-conditioned routes" class="w-full rounded-lg shadow-md mb-2 modal-trigger cursor-pointer"><figcaption class="text-sm text-gray-500 italic font-sans text-center">Fig 7. Three-seed training signals and persona-type differences observed in UE behavior composition and movement</figcaption></figure>

### 7.1 Unseen-occupation ablation

The confirmed evaluation uses 240 training personas and 60 evaluation personas. Random identification is approximately 1.7%.

| Condition | Environment reward ↑ | Internal persona ID ↑ | Coherence ↑ |
| --- | ---: | ---: | ---: |
| Full PCSP, FiLM | 104.1 | 17.0% | 2.06 |
| Without InfoNCE | 118.4 | 1.7% | 1.07 |
| Without diversity | 122.1 | 16.0% | 2.05 |
| Concat conditioning | 107.0 | 28.3% | 7.60 |

Removing InfoNCE increased environment reward but reduced internal identification to random level. This demonstrates that performing the life task and remaining traceable in the learned representation are different evaluation axes. Internal identification and Coherence use the learned trajectory encoder; they are not human-rating scores.

### 7.2 Independent behavior evaluation and human pilot

An independent v3-large evaluation excludes policy logits and the learned trajectory encoder.

| Mean Big Five balanced accuracy | Full | Without InfoNCE |
| --- | ---: | ---: |
| Behavior statistics only | 0.482 | 0.511 |
| State and state-conditioned behavior included | 0.556 | 0.558 |

This evaluation did not establish a behavioral advantage for InfoNCE, so the corresponding claim is limited to improved alignment of learned trajectory and persona representations. In a separate 30-person, two-choice coarse-trace pilot, 612 of 900 aggregated responses were correct, or **68.0%** against a 50% chance level. This suggests that people can read some behavioral differences, but it is not a naturalness rating of the current UE scene and does not validate every Big Five trait.

* * *

## 8. Execution Optimization: From Actors to Mass

Individual Actors, concurrent path requests, animation, and render proxies became bottlenecks before the policy network itself. In an earlier Actor baseline, movement failure rose from 0.2% at 64 NPCs to 4.7% at 96 and 44.9% at 128. ONNX calls were about 0.13-0.20 ms, but synchronized path demand reduced execution reliability.

<figure class="flex flex-col items-center my-8"><img src="/images/pcsp/fig8_npcincerasing.png" alt="Frame cost, policy service time, and arrival throughput as Mass NPC count increases" class="w-full rounded-lg shadow-md mb-2 modal-trigger cursor-pointer"><figcaption class="text-sm text-gray-500 italic font-sans text-center">Fig 8. Separating whole-frame scaling from per-decision policy time and per-NPC arrival throughput</figcaption></figure>

<figure class="flex flex-col items-center my-8"><img src="/images/pcsp/fig9_actor_mass_comparison.png" alt="Diagnostic frame-cost comparison between Actor and Mass execution" class="w-full rounded-lg shadow-md mb-2 modal-trigger cursor-pointer"><figcaption class="text-sm text-gray-500 italic font-sans text-center">Fig 9. Diagnostic frame-cost comparison of the earlier Actor + PCSP and Mass + PCSP structures</figcaption></figure>

The Mass path stores persona ID, needs, intent, transform, destination, and bounded history in Fragments processed in batches. Decision cohorts and per-frame budgets spread inference requests, while logical zone capacity is connected to physical interaction-slot reservations.

### Confirmed All-Mass scaling result

| Mass NPCs | Frame mean (ms) | Aggregated window p95 (ms) | Mass arrivals/NPC/min |
| ---: | ---: | ---: | ---: |
| 128 | 26.21 ± 0.07 | 29.16 ± 0.24 | 4.66 ± 0.11 |
| 256 | 26.53 ± 0.15 | 29.68 ± 0.34 | 4.63 ± 0.09 |
| 512 | 27.23 ± 0.07 | 31.02 ± 0.02 | 4.61 ± 0.09 |
| 1,024 | 28.42 ± 0.17 | 34.14 ± 0.11 | 4.76 ± 0.06 |

The benchmark was recorded on 2026-09-02 in UE 5.8 visible standalone at 800x450, using static Manny LOD1 HISM and zone-level movement. It used seeds 0/1/2 for each population, 12 runs total, with the first 5 seconds excluded from each 60-second run. Increasing population eightfold from 128 to 1,024 added 2.21 ms to mean frame cost while maintaining roughly 4.6-4.8 arrivals per NPC per minute.

A 28.42 ms mean corresponds to about 35.2 FPS; it does not claim 60 FPS or guarantee every frame remains above 30 FPS. The maximum 4.96x diagnostic gap in Fig 9 also includes differences in representation and movement semantics, so it is not presented as a pure “BT removal” speedup.

* * *

## 9. Rendering Optimization: Redesigning the Representation Unit

Creating a SkeletalMesh, AnimBP, and render proxy per NPC scales independently of simulation logic. Background NPCs therefore remove per-NPC Skeletal Components, replay Idle/Walk animation through AnimToTexture data, and send only per-instance phase and velocity through custom data. Near instances update every frame; mid- and far-distance instances update every 0.06 and 0.15 seconds, with representation culled at 300 m.

<figure class="flex flex-col items-center my-8"><img src="/images/pcsp/fig10_rendering-optimization-comparison.png" alt="Comparison of skeletal and instanced character representation pipelines" class="w-full rounded-lg shadow-md mb-2 modal-trigger cursor-pointer"><figcaption class="text-sm text-gray-500 italic font-sans text-center">Fig 10. Per-NPC skeletal, shared-leader-pose, and Manny instancing measurements that led to the VAT + ISM pipeline</figcaption></figure>

In the diagnostic smoke scene, Manny LOD1 instanced measured 114.54 ms versus 234.14 ms for per-NPC skeletal, a **51.1% lower** mean frame cost. This is a workload-specific diagnostic result, not a general GPU speedup for the final city. Sharing pose computation and sharing render objects are separate optimization problems.

* * *

## 10. Measuring Silhouette Cost with Unreal Insights

I compared accumulated BasePass time for simple cylinder instances and Manny LOD1 instances to isolate the cost of restoring a character silhouette and its vertex attributes. The goal was to verify whether numbers obtained with placeholder geometry remained representative after introducing a recognizable NPC mesh.

<div class="grid grid-cols-1 md:grid-cols-2 gap-6 my-8 items-start"><figure class="flex flex-col items-center"><img src="/images/pcsp/fig11_cylinder.png" alt="Unreal Insights capture for cylinder objects" class="w-full rounded-lg shadow-md mb-2 modal-trigger cursor-pointer"><figcaption class="text-sm text-gray-500 italic font-sans text-center">Fig 11. BasePass measurement for simple cylinder instances: approximately 13.20 ms</figcaption></figure><figure class="flex flex-col items-center"><img src="/images/pcsp/fig12_manny.png" alt="Unreal Insights capture for Manny objects" class="w-full rounded-lg shadow-md mb-2 modal-trigger cursor-pointer"><figcaption class="text-sm text-gray-500 italic font-sans text-center">Fig 12. BasePass measurement for Manny LOD1 instances: approximately 32.73 ms</figcaption></figure></div>

Applying Manny increased whole-frame cost by about 2.70 ms relative to placeholder geometry. The comparison showed that removing CPU animation alone was insufficient; vertex count, materials, shadows, draw submission, and VRAM needed independent GPU validation. The maximum size of 24 large textures was limited to 2,048, while animation data textures were not reduced by the same rule.

* * *

## 11. Asynchronous Policy Inference and the Game Thread Boundary

Workers never access UObjects directly. The Game Thread copies stable IDs, observations, and personas into POD snapshots. A dedicated NNE model instance dynamically batches up to 32 inputs on a worker, and completed results are committed by stable ID on a later Game Thread phase. The Game Thread does not block waiting for the next future.

<figure class="flex flex-col items-center my-8"><img src="/images/pcsp/fig13_multithread_optimization.png" alt="Moving bounded spatial-query and ONNX work off the Game Thread" class="w-full rounded-lg shadow-md mb-2 modal-trigger cursor-pointer"><figcaption class="text-sm text-gray-500 italic font-sans text-center">Fig 13. POD snapshots, dynamic batching, and non-blocking commits move only bounded work off the Game Thread</figcaption></figure>

- In a 128-Actor, 30-second x 3-seed snapshot + uniform-grid pilot, scoped spatial-query GT cost changed from **637.85 to 85.90 ms per 30 seconds**, about 86.4% lower.
- In a 16-Actor + 1,008-Mass pilot, ONNX-related GT cost changed from **1.142 to 0.045 ms/frame**, about 96.1% lower.
- Separate worker inference cost was approximately 0.978 ms/frame.
- Decision throughput changed by -0.6% and arrival throughput by -0.3% in the same short pilot.

The 96.1% value refers to the measured ONNX-related Game Thread scope, not total computation or total FPS. Nor does Mass automatically make every Processor parallel. The current simulation Processor requires the Game Thread, while worker inference remains an opt-in path.

* * *

## 12. Inspecting the Persona-Behavior Link at Runtime

<figure class="flex flex-col items-center my-8"><img src="/images/pcsp/fig14_live-persona-source.png" alt="HUD comparing the personas and recent decisions of two NPCs" class="w-full rounded-lg shadow-md mb-2 modal-trigger cursor-pointer"><figcaption class="text-sm text-gray-500 italic font-sans text-center">Fig 14. Natural-language personas, current actions, destinations, and recent decisions for a selected NPC and a pinned comparison NPC</figcaption></figure>

The HUD selects a stable entity and displays Persona ID, name, occupation, age, and personality text. `NOW` connects the current semantic action to movement or interaction state, destination, and remaining distance. Recent history retains time-ordered decision samples. Pinning freezes a snapshot from a second NPC for side-by-side inspection.

In Fig 14, the selected NPC chose `HygieneQuick` after `SocializeInitiate`, while the pinned record shows repeated `RestAlone`. This is a real example of different decision histories, but the NPCs also differ in needs, position, and time. The image alone does not establish a causal persona effect. That requires fixed-observation tests that vary only the persona vector and controlled repeated rollouts.

* * *

## 13. Reproducible Runtime Performance Validation

<figure class="flex flex-col items-center my-8"><img src="/images/pcsp/fig15_live-performance-source.png" alt="Runtime panel comparing FPS, CPU, policy latency, and throughput" class="w-full rounded-lg shadow-md mb-2 modal-trigger cursor-pointer"><figcaption class="text-sm text-gray-500 italic font-sans text-center">Fig 15. Runtime performance panel separating persona effect, execution structure, and inference mode</figcaption></figure>

Each performance run follows `Fresh World -> Warm-up -> Record -> Validate`:

1. Restart each variant with the same population, seed, initial state, and camera.
2. Exclude the first 5 seconds after the population is ready.
3. Record CPU, FPS, decisions, arrivals, and policy latency for 30 seconds.
4. Validate camera, resolution, completion, and other conditions before exporting CSV/JSON.

The tool keeps three comparisons separate:

| Axis | Variants | Question |
| --- | --- | --- |
| Persona effect | PCSP / Needs heuristic / No Persona | How does behavior distribution change, and what decision cost is added? |
| Execution | Actor + BT / Mass | How do full execution cost and throughput differ? |
| Inference | synchronous / worker batch | Are service time, result delay, and throughput preserved? |

`No Persona` zeros the persona vector of the same trained policy; it is not a separately trained persona-free model. `Needs heuristic` is also not equivalent to running one BT per NPC.

* * *

## 14. Tracing “Why This Action?”

<figure class="flex flex-col items-center my-8"><img src="/images/pcsp/fig16_why-action-source.png" alt="HUD linking needs and persona to observation, policy action, and world result" class="w-full rounded-lg shadow-md mb-2 modal-trigger cursor-pointer"><figcaption class="text-sm text-gray-500 italic font-sans text-center">Fig 16. Persona + Needs -> 33D Observation -> PCSP Policy -> Action + World Result</figcaption></figure>

Logging only the selected output cannot explain what the model observed or whether the world completed the action. PCSP therefore joins the following records by stable NPC ID:

- fixed persona data and eight changing needs
- all 33 observation fields and original `policy_action_index`
- the mapped UE semantic action and 20-action logits
- affordance category, selected zone, and slot reservation
- movement, arrival, interaction start/completion, and failure results

### Semantic differences between the Python and UE 33D observations

The deployment preserves input/output dimensions and research action indices, but not every observation meaning is identical.

| Field | Python v3 base | UE Mass | Validation impact |
| --- | --- | --- | --- |
| Position | 6x6 row/column | continuous X/Y within district | different spatial meaning and distribution |
| Time | integer hour / 23 | continuous phase over 600 seconds | different sample distribution |
| 11-18 | nearest-facility one-hot | previous Intent category | different source and enum order |
| 19 | nearby count / 4 | local-grid count / live population | population-dependent distribution |
| 20-23 | social and repetition signals from research actions | history of mapped UE actions | semantics change when actions merge |
| 24-32 | data for three other agents | currently zero-padded | neighbor-specific information is absent |

“The policy I/O shape was preserved” must therefore remain distinct from “Python and UE state semantics are fully equivalent.” A fixed-input replay validates synchronous versus worker logits with maximum absolute error below 0.001, but it does not validate observation meaning or long-horizon trajectory equivalence.

* * *

## 15. Connecting 1,024 Decisions to Places in a City

To convert the 20 research actions into visible world activity, the city contains 16 districts, 118 affordance zones, and 1,704 interaction slots. Zones provide destinations for 11 behavior categories; slots carry position, capacity, reservation state, and duration.

<div class="grid grid-cols-1 md:grid-cols-2 gap-6 my-8 items-start"><figure class="flex flex-col items-center"><img src="/images/pcsp/fig17_dieselpunk-city-affordances.png" alt="Affordance zones and interaction slots across the city" class="w-full rounded-lg shadow-md mb-2 modal-trigger cursor-pointer"><figcaption class="text-sm text-gray-500 italic font-sans text-center">Fig 17. Behavior destinations and interaction slots distributed across 16 districts</figcaption></figure><figure class="flex flex-col items-center"><img src="/images/pcsp/fig18_live_npc_routes.png" alt="Live NPC routes through the city" class="w-full rounded-lg shadow-md mb-2 modal-trigger cursor-pointer"><figcaption class="text-sm text-gray-500 italic font-sans text-center">Fig 18. Live routes connecting policy decisions to zone selection, reservation, movement, and arrival records</figcaption></figure></div>

The Mass population is deterministically distributed across districts. Policy output maps through an affordance category to an available zone and interaction slot. Physical slot reservations, rather than logical capacity alone, make contention and completion observable when many NPCs choose the same destination.

* * *

## Results and Claim Boundaries

- Converted text personas into a 64D condition for one shared Actor selecting priorities over 20 actions from a 33D state.
- Combined PPO and FiLM conditioning with InfoNCE trajectory alignment and KL-based policy separation.
- Evaluated environment reward, learned representation alignment, independent behavior statistics, and a human pilot as separate evidence.
- Integrated Mass execution, affordance slots, instanced rendering, and asynchronous batch inference, confirming scaling to 1,024 NPCs under a specified All-Mass benchmark condition.
- Built reproducible validation with fixed conditions, warm-up exclusion, multiple seeds, and CSV/JSON export.

The results do not claim that the current city demo sustains 1,024 NPCs at 60 FPS, nor that total FPS improved by 96.1%. Semantic alignment between Python and UE observations, Shipping-build performance in the new city, and long-horizon behavior quality remain explicit follow-up validation items. PCSP's main contribution is not only a shared model; it is the **end-to-end integration of learned decisions into a large game world with claims separated into measurable, auditable scopes**.
