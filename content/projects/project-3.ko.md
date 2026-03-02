---
title: "V: VR FPS Shooting Game"
description: "디자인 패턴과 컴포넌트 기반 설계를 통해 확장성과 유지보수성을 확보한 UE5 VR FPS"
weight: 3
translationKey: "project-v"

duration: "2023.09 ~ 2024.05"
team_size: "3 people"
role: "AI 시스템 프로그래머"
github: "https://github.com/Hongyoosung/GOBT"
youtube: "https://www.youtube.com/watch?v=Dl0W6wjeUj0"
math: true
---


---

## 개요

본 프로젝트는 Unreal Engine 5를 기반으로 개발된 **VR FPS 슈팅 게임**입니다. 단순히 기능을 구현하는 것을 넘어, 객체 지향 설계 원칙을 준수하여 복잡한 전투 시스템의 결합도를 낮추는 데 집중했습니다. **Observer, Facade, Component 패턴**을 적극 활용하여 수십 명의 아군과 적군이 뒤섞이는 전장 환경에서도 안정적으로 동작하는 대미지 시스템과 AI 의사결정 구조를 구축했습니다.


{{< gif-grid urls="/gifs/project3/V1.gif, /gifs/project3/V2.gif" widths="57%, 43%" >}}

---

## 기술 스택

| Category | Technologies |
|---|---|
| **Game Engine** | Unreal Engine 5 (UE5) |
| **AI Architecture** | Behavior Tree, AI Controller |
| **Design Patterns** | Observer, Facade, Component Pattern |
| **Platform** | Windows (VR Support) |
| **Language** | Blueprint |

---

## 주요 기능

### 1. 패턴 기반의 유연한 엔티티 관리
* **Observer 패턴을 활용한 이벤트 드리븐 설계**: 각 개체의 체력 변화나 사망 상태를 하드 코딩된 참조 없이 처리합니다. 데미지 발생 시 이벤트를 브로드캐스팅하여 UI 업데이트, 애니메이션 전환, 사운드 재생 등이 독립적으로 반응하도록 설계했습니다.
* **Facade 패턴을 통한 인터페이스 통합**: 공격, 체력 확인, 팀 식별 등 복잡한 내부 로직을 단일 인터페이스로 캡슐화했습니다. 외부 시스템은 개체의 상세 구현을 몰라도 상위 레이어에서 간편하게 데이터에 접근할 수 있습니다.

{{< img-grid 
    src1="/images/project3/damage_archi.png" cap1="그림 1. Unit 구조 UML"
    class1="w-3xl"

    src2="/images/project3/damage_flow.png" cap2="그림 2. 데미지 인터페이스 흐름도"
    class1="w-2xl"

    class="max-w-full" 
>}}



### 2. 모듈형 컴포넌트 기반 데미지 시스템
* **Plug-and-Play 구조**: 데미지 처리 로직을 독립적인 컴포넌트로 분리했습니다. 이를 통해 플레이어, NPC뿐만 아니라 파괴 가능한 구조물 등 어떤 오브젝트에도 해당 컴포넌트를 부착하는 것만으로 손쉽게 데미지 시스템을 이식할 수 있습니다.
* **Projectile 기반 충돌 판정**: 발사체(Projectile)의 충돌 이벤트를 바인딩하여 정확한 피격 지점을 계산하고, `TakeDamage` 함수를 호출하여 신뢰도 높은 물리 연산을 수행합니다.

### 3. 계층적 행동 트리(Behavior Tree) AI
* **전술적 의사결정**: 아군과 적군 AI의 판단 로직을 BT로 구현했습니다. 타겟 감지부터 사거리 기반의 상태 전환까지 계층적으로 관리합니다.
* **동적 거리 제어**: 적과의 거리가 `IdleRange`보다 멀 경우 공격하며 접근하고, 사거리 내에 들어오면 조준 및 고정 사격을 수행하는 유기적인 전술 행동을 보여줍니다.

{{< img src="/images/project3/bt.png" 
        alt="Behavior Tree Graph" 
        class="max-w-2xl" 
        caption="그림 3. 아군/적군 공용 베이스 행동 트리 구조" >}}

---

## 주요 기술적 난제 및 해결 전략

### 1. 객체 간 강한 결합도(Tight Coupling) 해결
* **Issue**: 다양한 유닛들이 서로의 정보를 참조하면서 코드 수정 시 연쇄적인 오류가 발생하는 현상이 확인되었습니다.
* **Solution**: **Facade 패턴**을 도입하여 유닛의 핵심 기능을 추상화했습니다. 또한 **Component 패턴**을 통해 기능을 조립식으로 구성하여 클래스 간의 직접적인 의존성을 제거했습니다.
* **Result**: 신규 유닛이나 특수 기능 추가 시 기존 코드를 수정할 필요가 없는 높은 확장성을 확보했습니다.

### 2. VR 환경에서의 대량 AI 최적화
* **Issue**: 다수의 NPC가 동시에 행동 트리를 실행할 때 발생하는 성능 저하 문제를 방지해야 했습니다.
* **Solution**: 감지 로직의 업데이트 주기를 조절하고, AI Controller에서 수행하는 연산을 비동기적으로 처리할 수 있도록 최적화했습니다. 타겟과의 거리에 따라 연산 빈도를 차등 적용하는 방식을 검토하여 적용했습니다.

---

## 결과

* **2023 G-STAR** 전시 참여 및 시연 완료.
* **2024 부산경남지역 게임전시회 Build 051** 전시 참여 및 시연 완료.

{{< img-grid 
    src1="/images/project3/picture1.jpg" 
    class1="w-3/4 mx-auto" 

    src2="/images/project3/picture2.jpg" 

    class="max-w-full"
>}}

<br>