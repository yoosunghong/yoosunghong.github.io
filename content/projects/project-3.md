---
title: "V: VR FPS Shooting Game"
description: "A scalable VR FPS framework built with UE5, leveraging design patterns and component-based architecture for enhanced maintainability."
weight: 3
translationKey: "project-v"

duration: "2023.09 ~ 2024.05"
team_size: "3 people"
role: "AI system programmer"
github: "https://github.com/Hongyoosung/GOBT"
youtube: "https://www.youtube.com/watch?v=Dl0W6wjeUj0"
math: true
---

---

## Overview

This project is a **VR FPS shooting game** developed using Unreal Engine 5. Rather than simply implementing features, the focus was on adhering to Object-Oriented Programming (OOP) principles to reduce the coupling of complex combat systems. By actively utilizing **Observer, Facade, and Component patterns**, I established a stable damage system and AI decision-making structure capable of handling environments where dozens of allies and enemies coexist.

{{< gif-grid urls="/gifs/project3/V1.gif, /gifs/project3/V2.gif" widths="57%, 43%" >}}

---

## Tech Stack

| Category | Technologies |
|---|---|
| **Game Engine** | Unreal Engine 5 (UE5) |
| **AI Architecture** | Behavior Tree, AI Controller |
| **Design Patterns** | Observer, Facade, Component Pattern |
| **Platform** | Windows (VR Support) |
| **Language** | Blueprint |

---

## Key Features

### 1. Pattern-Based Flexible Entity Management
* **Event-Driven Design via Observer Pattern**: Handled health changes and death states without hard-coded references. When damage occurs, events are broadcasted to allow UI updates, animations, and sound effects to react independently.
* **Interface Integration via Facade Pattern**: Encapsulated complex internal logics such as attacking, health checks, and team identification into a single interface. This allows external systems to access data easily without knowing the detailed implementation of the entities.



{{< img-grid 
    src1="/images/project3/damage_archi.png" cap1="Figure 1. Damage System UML"
    class="max-w-full" 

    src2="/images/project3/damage_flow.png" cap2="Figure 2.  Damage System Flow"
    class="max-w-full" 
    
>}}



### 2. Modular Component-Based Damage System
* **Plug-and-Play Structure**: Decoupled damage processing logic into independent components. This allows the damage system to be easily ported to any object—such as players, NPCs, or destructible structures—simply by attaching the component.
* **Projectile-Based Collision Detection**: Bound projectile collision events to calculate accurate hit points and called the `TakeDamage` function to perform reliable physical calculations.

### 3. Hierarchical Behavior Tree AI
* **Tactical Decision Making**: Implemented decision-making logic for both allied and enemy AI using Behavior Trees (BT). Managed states hierarchically from target detection to range-based transitions.
* **Dynamic Distance Control**: Designed organic tactical behavior where AI approaches while firing if the target is beyond `IdleRange`, and performs aiming and stationary fire once within range.

{{< img src="/images/project3/bt.png" 
        alt="Behavior Tree Graph" 
        class="max-w-2xl" 
        caption="Fig 3. Common Base Behavior Tree Structure" >}}

---

## Technical Challenges & Solutions

### 1. Resolving Tight Coupling Between Objects
* **Issue**: Observed a phenomenon where modifying one unit's code caused cascading errors due to strong dependencies.
* **Solution**: Introduced the **Facade pattern** to abstract core unit functions and utilized the **Component pattern** to build features modularly, removing direct dependencies between classes.
* **Result**: Secured high scalability, allowing the addition of new units or special features without modifying existing code.

### 2. Optimizing Large-Scale AI in VR
* **Issue**: Needed to prevent performance degradation caused by multiple NPCs executing Behavior Trees simultaneously.
* **Solution**: Optimized AI by adjusting the update cycles of sensing logic and managing AI Controller operations asynchronously. Implemented a distance-based tick system to differentiate update frequencies based on proximity to the player.

---

## Results

* Exhibited and demonstrated at the **2024 Busan-Gyeongnam Game Exhibition (Build 051)**.
* Exhibited and demonstrated at the **2023 G-STAR** competition.


{{< img-grid 
    src1="/images/project3/picture1.jpg" 
    class1="w-3/4 mx-auto" 

    src2="/images/project3/picture2.jpg" 

    class="max-w-full"
>}}

<br>