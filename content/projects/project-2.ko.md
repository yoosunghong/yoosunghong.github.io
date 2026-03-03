---
title: "GOBT: Goal-Oriented Behavior Tree"
description: "Behavior Tree의 구조적 직관성과 GOAP·Utility Theory의 동적 유연성을 결합한 하이브리드 AI 프레임워크"
weight: 2
translationKey: "project-gobt"

duration: "2023.05 ~ 2024.02"
team_size: "2명"
role: "메인 프로그래머, 논문 작성"
github: "https://github.com/yoosunghong/GOBTv2.0"
paper: "https://doi.org/10.33851/JMIS.2023.10.4.321"
math: true
---

---

## 개요

본 프로젝트는 행동 트리(BT)의 구조적 명확성과 목적 지향 액션 플래닝(GOAP)의 상황 적응성을 융합한 Unity 기반 **계층형 AI 프레임워크** 입니다. 표준 BT 내에 GOAP과 유틸리티 이론을 접목한 커스텀 알고리즘 노드를 통합함으로써, 기존 NPC AI의 정적인 의사결정 한계를 극복하고자 했습니다. 상위 수준의 흐름 제어는 BT가 담당하고, 복잡한 상황 판단은 커스텀 노드에 위임하는 계층적 설계를 통해 연산 효율성과 개발 편의성을 동시에 확보했습니다.

{{< gif-grid urls="/gifs/project2/gobt1.gif, /gifs/project2/gobt2.gif" widths="50%, 50%" >}}

{{< img src="/images/project2/main.png" 
        alt="메인 아키텍처" 
        class="max-w-2xl" 
        caption="그림 1. 3계층 프레임워크 구조" >}}

---

## 기술 스택

| Category | Technologies |
|---|---|
| **Game Engine** | Unity 3D |
| **AI Architecture** | Behavior Tree, GOAP (Goal-Oriented Action Planning), Utility System |
| **Tools/Assets** | Behavior Designer |
| **Language** | C# |


---

## 주요 기능

### 1. 플래너 노드를 통한 데이터 주도형 상태 전이
* **Enum 비트마스크 기반 월드 상태 표현**: 에이전트 상태와 환경 데이터를 Enum 기반 비트마스크로 인코딩했습니다. HasWeapon, LowHealth 등의 조건을 비트 플래그로 관리하여, 조건 일치 여부를 문자열 비교나 딕셔너리 조회 없이 빠른 비트 연산(AND/OR)만으로 판별합니다. WorldState 구조체는 불변 값 타입(Immutable Value Type)으로 설계되어 비교 시 힙 할당(Heap Allocation)이 발생하지 않도록 했습니다.

* **전/후 조건 기반 액션 탐색**: 에이전트의 현재 월드 상태와 각 액션의 사전조건(Pre-condition) 마스크를 비교하여 상태를 동적으로 전이합니다. 각 액션에 사전조건과 사후효과(After-effect)만 명시하면 시스템이 목표 도달을 위한 최적의 그래프를 자동 생성하므로, 하드코딩된 전이 로직이 필요 없는 데이터 주도형 구조를 실현했습니다.

* **유틸리티 기반 실시간 전방향 액션 체이닝**: 역방향 플래닝을 사용하는 전통적 GOAP의 실시간 반응성 한계를 보완하기 위해 전방향 최적화(Forward Optimization) 방식을 도입했습니다. 현재 상태에서 실행 가능한 액션들을 유틸리티 점수에 따라 탐욕적(Greedy)으로 체이닝하며, 환경 변화에 따라 가중치를 실시간 재계산하여 유연한 목표 수정이 가능합니다.


{{< img-grid 
    src1="/images/project2/statenode.png" cap1="그림 2. 액션 선택 과정. 에이전트는 선택된 행동의 After-effect를 Current State로 갖는다."
    class1="w-3/4" 
    
    src2="/images/project2/stategraph.png" cap2="그림 3. State Space Graph"
    
    
    class="max-w-full" 
>}}


```csharp
[Flags]
public enum WorldStateFlags : uint
{
    None           = 0,
    EnemyVisible   = 1 << 0,
    EnemyInRange   = 1 << 1,
    LowHealth      = 1 << 2,
    HasWeapon      = 1 << 3,
    IsBlocking     = 1 << 4,
    EnemyDead      = 1 << 5,
    InCover        = 1 << 6,
    IsExhausted    = 1 << 7,
    HealthRestored = 1 << 8,
}

// Immutable value-type wrapper — zero GC allocation during comparisons
public readonly struct WorldState
{
    public readonly WorldStateFlags Flags;
    public bool Has(WorldStateFlags f)           => (Flags & f) == f;
    public WorldState With(WorldStateFlags f)    => new(Flags | f);
    public WorldState Without(WorldStateFlags f) => new(Flags & ~f);
    public bool Satisfies(WorldStateFlags goal)  => (Flags & goal) == goal;
    public uint Key => (uint)Flags; // O(1) key for visited-set / cache lookups
}
```

<br>

### 2. 유틸리티 기반 실시간 의사결정 최적화
* **다변수 데이터 정규화**: 체력, 거리, 레벨 등 서로 다른 단위의 환경 변수를 **0.0~1.0 범위로 정규화**하여 판단의 객관성을 확보했습니다. 이를 통해 비선형적인 전장 상황을 수치화된 가치로 변환합니다.

* **최적 기대 가치 산출**: 단순히 고정된 우선순위를 따르지 않고, 가중치($w$)가 적용된 유틸리티 함수를 실시간 평가하여 기회비용이 가장 낮고 기대 가치가 높은 행동을 선택합니다.

$$U_{final} = \max(w_1 \cdot U_1, w_2 \cdot U_2, \dots, w_n \cdot U_n)$$


{{< img src="/images/project2/graph.png" 
        alt="유틸리티 그래프" 
        class="max-w-3xl" 
        caption="그림 4. 정규화와 미세 환경 변화 반응 그래프" >}}

<br>

### 3. 모듈화된 Authoring Tool 및 확장성
* **Decoupled Architecture**: 런타임 탐색 로직(Planner)과 개별 행동 로직(Action)을 완전히 분리했습니다. 새로운 행동 추가 시 기존 코드를 수정할 필요 없이 독립적인 액션 노드만 추가하면 되는 **Open-Closed Principle**을 준수합니다.

* **ScriptableObject 기반 모듈 조합**: '체력 검사', '거리 산출' 등의 평가 로직을 에셋화하여 기획자가 인스펙터 상에서 레고 블록처럼 조합할 수 있는 워크플로우를 구축, **AI 저작 비용(Authoring Cost)을 획기적으로 절감**했습니다.

* **인터페이스 기반 확장성 (OCP 준수)**: 플래너 런타임과 개별 액션 로직을 추상 클래스로 엄격히 분리했습니다. 새로운 액션 타입을 추가할 때 플래너 수정 없이 인터페이스만 구현하면 되므로, **개방-폐쇄 원칙(Open-Closed Principle)** 을 충족합니다.

```csharp
// Abstract base — one method contract, zero runtime coupling
public abstract class GOBTEvaluatorSO : ScriptableObject
{
    /// <returns>Utility score in [0, 1]. 1 = maximally desirable.</returns>
    public abstract float Evaluate(AgentController agent);
}

// Example: HealthEvaluatorSO, DistanceEvaluatorSO, ThreatEvaluatorSO,
// and CompositeEvaluatorSO (nestable weighted sum of child evaluators)
// are all authored as .asset files and assigned in the Inspector.
```



{{< img-grid-3
    src1="/images/project2/unity1.png" cap1="그림 5. Behavior Designer 내에 배치된 커스텀 플래너 노드" class1="w-full"
    src2="/images/project2/action.png" cap2="그림 6. 사전조건/사후효과가 정의된 액션 클래스의 인스펙터 창" class2="w-3/4"
    src3="/images/project2/planner.png" cap3="그림 7. 커스텀 플래너 노드에서 목표 상태와 평가 상태변수를 설정하는 인스펙터 창" class3="w-1/2"
    class="max-w-full" 
>}}

---

## 주요 기술적 난제 및 해결 전략

### 1. 다중 에이전트 연산 병목 해결 (Time-slicing)
* **Issue**: 수십 명의 에이전트가 동시에 그래프를 구축할 때 발생하는 CPU Spike 현상 확인.
* **Solution**: 단일 프레임의 과도한 연산을 방지하기 위해 **코루틴 기반 시분할 처리(Time-slicing)** 기법을 도입. 프레임당 가용 연산 시간을 초과할 경우 작업을 다음 프레임으로 이월.
* **Result**: 초기화 시 발생하는 프레임 저하를 **80% 이상 개선**, 대규모 유닛 환경에서도 안정적인 프레임 유지.


```csharp
public IEnumerator PlanCoroutine(PlanRequest request)
{
    float frameStart = Time.realtimeSinceStartup;

    while (_openList.Count > 0)
    {
        // Yield to next frame if this frame's budget is exceeded
        if (Time.realtimeSinceStartup - frameStart > FrameBudgetMs * 0.001f)
        {
            yield return null; // resume next frame
            frameStart = Time.realtimeSinceStartup;
        }

        var current = _openList[0];
        _openList.RemoveAt(0);

        if (current.State.Satisfies(request.GoalFlags))
        {
            BuildPlan(current, request.ResultPlan);
            FinalizeRequest(request, succeeded: true);
            yield break;
        }
        // ... expand neighbours
    }
}
```

{{< img-grid 
    src1="/images/project2/before.png" cap1="그림 8. 기본 방식(블로킹 발생)"
    src2="/images/project2/after.png" cap2="그림 9. 코루틴 시분할 방식"

    class="max-w-full" 
>}}



### 2. 그래프 내 갇힘 문제
* **Problem**: 동적 환경 변화로 인해 에이전트가 특정 액션들 사이에서 목표에 도달하지 못하고 무한히 반복(Oscillation)하거나, 동일한 상태를 순환하며 목표 달성에 실패하는 현상이 확인되었습니다.
* **Solution**: 탐색 알고리즘에 **방문 노드 리스트(Visited List)** 와 최대 탐색 깊이(Max Depth) 제한을 도입했습니다. 또한, 동일 행동 반복 시 가중치에 페널티를 부여하는 '스티키니스(Stickiness)' 개념을 적용하여 강제로 다른 대안 노드를 탐색하도록 유도했습니다.
* **Result**: 예외적인 환경 변화 상황에서도 에이전트가 교착 상태에 빠지지 않고 대안 루트를 탐색하거나 상위 목표로 복귀하는 등 의사결정의 안정성을 확보했습니다.

```csharp
// Inside PlanCoroutine — Visited List prevents revisiting identical world states
uint key = next.Key;
if (_visited.Contains(key)) continue;
_visited.Add(key);

// Stickiness: inflate cost when the same action repeats consecutively
float cost = action.Cost;
if (current.LastAction != null && current.LastAction == action)
    cost *= StickinessMultiplier; // default 3×

// Inside GOBTEvaluationEngine — RepeatPenalty at the evaluation layer
float weighted = action.UtilityWeight * Normalize.Clamp01(rawScore);
if (action == _lastAction)
    weighted *= RepeatPenalty; // default 0.55×
```

<br>

### 3. 유틸리티 계산 비용 최적화 (Weight Caching)
* **Problem**: 상태 전환 시마다 모든 하위 노드의 유틸리티 가중치를 실시간으로 전수 계산하는 방식은 에이전트 수에 비례하여 CPU 연산 부하를 가중시켰습니다.
* **Solution**: 유틸리티 값에 영향을 주는 핵심 변수(체력, 거리 등)가 일정 임계값 이상 변하지 않았을 경우, 이전 계산값을 재사용하는 캐싱 매커니즘을 도입했습니다. 또한, 업데이트 주기를 에이전트별로 엇갈리게 배치하는 틱(Tick) 시스템을 병행했습니다.
* **Result**: 유틸리티 계산 빈도를 효율적으로 조절함으로써, 연산 비용을 최적화하고 더 많은 수의 에이전트를 한 화면에 배치할 수 있는 성능적 여유를 확보했습니다.


```csharp
// GOBTEvaluationEngine — cache keyed on the WorldStateFlags bitmask
public IReadOnlyList<ScoredAction> Score(AgentController agent,
    IReadOnlyList<GOBTActionData> actions, WorldStateFlags currentStateFlags)
{
    // Cache hit: world state unchanged → skip all evaluator calls
    if (currentStateFlags == _cachedStateKey && _cachedScores.Count > 0)
        return _cachedScores;

    _cachedStateKey = currentStateFlags;
    _cachedScores.Clear();
    // ... evaluate and sort actions
}

// GOBTTickManager — only 1/N agents replan per frame (N = TickGroups)
private void Update()
{
    int bucket = _frameCount % _tickGroups;
    for (int i = 0; i < _agents.Count; i++)
        if (i % _tickGroups == bucket)
            _agents[i].RequestReplan();
    _frameCount++;
}
```

<br>

### 4. 오브젝트 풀링을 통한 GC 스파이크 방지
* **Problem**: 플래닝 과정에서 중간 상태를 표현하기 위해 수많은 StateNode 객체가 생성되어 빈번한 가비지 컬렉션(GC) 유발.

* **Solution**: 시작 시 미리 할당된 **오브젝트 풀(StateNodePool)** 을 도입했습니다. 노드를 렌트하여 사용 후 탐색이 완료되면 일괄 반납하는 구조로 설계하여, 플래닝 시 발생하는 힙 할당을 거의 제로(Zero-allocation)에 가깝게 유지했습니다.

* **Result**: GC로 인한 프레임 끊김 현상을 제거하여 실시간 전투 시나리오에서의 실용성을 높였습니다.

```csharp
// Pre-allocated at planner construction — no runtime new() for StateNode
private readonly StateNodePool _nodePool = new(256);

// Rent a node from the pool; create overflow only if pool is exhausted
public StateNode Rent()
{
    if (_pool.Count > 0) return _pool.Pop();
#if UNITY_EDITOR
    Debug.LogWarning("[StateNodePool] Pool exhausted — allocating overflow node.");
#endif
    return new StateNode();
}

// After planning: return all rented nodes in one pass, clearing the list
public void ReturnAll(List<StateNode> nodes)
{
    foreach (var n in nodes) { n.Reset(); _pool.Push(n); }
    nodes.Clear();
}

// Usage in PlanCoroutine
var child = _nodePool.Rent();
_allRented.Add(child);
// ... populate child ...
// After plan resolves:
_nodePool.ReturnAll(_allRented);
```

<br>


---

## 결과

* [**Journal of Multimedia Information System (JMIS)** 2023년 10월호 4권 'GOBT: A Synergistic Approach to Game AI Using Goal-Oriented and Utility-Based Planning in Behavior Trees'](https://doi.org/10.33851/JMIS.2023.10.4.321) 제 1저자 투고 및 출판 완료.
* **역할**: 메인 프로그래머, 논문 작성


<br>