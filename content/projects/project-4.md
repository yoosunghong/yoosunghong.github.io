---
title: "Blockchain-Enabled Metaverse IoT Communication Platform"
description: "Ensuring Data Integrity and Real-time Synchronization between Virtual Environments and Physical IoT Assets"
weight: 4
translationKey: "project-4"

duration: "2022.10 ~ 2023.12"
team_size: "1 people"
role: "Main programmer, paper writer"
github: "https://github.com/yoosunghong/Metaverse_for_IoT/tree/main/Decentralized_MQTT"
paper: "https://kism.or.kr/file/memoir/13_4_8.pdf"
math: true
---


---

## Overview

This project focuses on developing a decentralized platform for secure and efficient data communication between metaverse environments and physical IoT devices. By integrating **Decentralized Identifier (DID)** based identity verification with the **MQTT protocol**, the system achieves robust data integrity and low-latency interaction. The platform leverages **Hyperledger Indy** to manage decentralized identities, ensuring trusted identification and verifiable credential management for all participating entities.



{{< img src="/images/project4/overview.png" 
        alt="System Overview Architecture" 
        class="max-w-3xl" 
        caption="Figure 1. High-level System Architecture" >}}

---

## Technical Stack

| Category | Technologies |
|---|---|
| **Blockchain / DID Ledger** | Hyperledger Indy |
| **IoT Communication** | MQTT (Mosquitto Broker) |
| **Metaverse Engine** | Unity 3D |
| **Backend** | Node.js, Express.js |
| **Frontend** | React.js |
| **Database** | MongoDBal Engine 5 (UE5) |
| **Language** | C#, Ptthon |

---

## Key Features

### 1. Decentralized Identity Management (DID/VC) via Hyperledger Indy
**"Establishing User-Centric Identity Sovereignty and Device Ownership"**

* **Self-Sovereign Identity (SSI)**: Developed a DID system based on Hyperledger Indy, allowing users to own and control their identities without reliance on a centralized authority.
* **Trust-Based Interaction**: Utilized **Verifiable Credentials (VC)** to authenticate the ownership relationship between metaverse avatars and physical IoT devices, ensuring privacy-preserving data communication.

{{< img src="/images/project4/vonnet.png" 
        alt="VonNet DID Ledger" 
        class="max-w-xl" 
        caption="Figure 2. Verified Device DIDs and Public Keys on VonNet" >}}

---

### 2. DPKI-Based IoT Data Integrity Framework
* **Hierarchical Topic Design**: Designed a structured MQTT topic schema (`home/devices/{DID}/{Sensor_Name}`) to embed the device's Decentralized Identifier (DID) directly within the message routing path.
* **Real-Time Integrity Verification**: The Unity client extracts the DID from incoming topics and performs real-time lookups of the corresponding Public Key on the blockchain to verify digital signatures.
* **Secure Architecture**: Established a **Decentralized PKI (DPKI)** structure that eliminates Man-in-the-Middle (MITM) vulnerabilities and ensures the absolute reliability of data.

{{< side-by-side src="/images/project4/sensor.png" caption="Figure 3. Sensors used in the implementation" >}}

| Sensor Type | Topic Structure |
| :--- | :--- |
| **Ultrasonic Sensor** | `home/devices/{device_DID}/ultrasonic` |
| **LED Module** | `home/devices/{device_DID}/led` |
| **Temperature Sensor** | `home/devices/{device_DID}/tem` | 

{{< /side-by-side >}}

---

### 3. Custom Packet Protocol based on MQTT Standards
* **Standard Compliance**: Adhered to the MQTT v3.1.1 specification (Fixed/Variable Header, Payload) to ensure full interoperability with existing broker infrastructures.
* **Automated Source Provenance**: Positioned the DID within the Topic Name of the Variable Header, enabling immediate source identification before the data parsing stage.
* **Security Packaging**: Structured the payload as `[Raw Data + Digital Signature]`, allowing the receiver to validate the authenticity of each individual message instantaneously.

{{< img src="/images/project4/packet.png" 
        alt="Message Packet Format" 
        class="max-w-xl" 
        caption="Figure 4. Proposed Message Packet Structure" >}}

---

### 4. Immersive Metaverse Integration Interface
**"Digital Twin-Based Intuitive IoT Control Environment"**

* **Unity Engine Integration**: Achieved real-time synchronization and visualization of physical IoT device states within a 3D metaverse environment.
* **Intuitive UI/UX**: Implemented avatar-based device control and data flow visualization, providing users with an immersive monitoring experience as if interacting with physical objects.

{{< img src="/images/project4/unity.png" 
        alt="Unity Metaverse Environment" 
        class="max-w-md" 
        caption="Figure 5. Real-time Monitoring in Unity Environment" >}}

---

## Technical Problem Solving

### 1. High-Performance Asynchronous Verification Pipeline
* **Problem**: Frequent blockchain lookups (I/O) and cryptographic signature verification (CPU) per frame caused main-thread bottlenecks and significant **frame drops (hiccups)**.
* **Solution**: Implemented a **Task-based Asynchronous Pattern (Async/Await)** to decouple the networking, data verification, and UI rendering threads.
* **Result**: Successfully maintained a stable **60 FPS** environment by optimizing the security layer overhead to within **4.3ms** compared to raw MQTT.

{{< img-grid 
    src1="/images/project4/case1.png" cap1="Figure 6. Before Optimization (Blocking)"
    class1="w-2/4" 

    src2="/images/project4/case2.png" cap2="Figure 7. After Optimization (Async Pipeline)"
    class1="w-3/4" 

    class="max-w-full" 
>}}

### 2. Event-Driven Hierarchical Topic Architecture
* **Problem**: High coupling between code and devices led to difficulties in managing frequent device connections/disconnections and adding new device types at runtime.
* **Solution**: Engineered a **hierarchical MQTT topic structure** (`home/devices/{DID}/{Sensor}`) to automate routing and utilized the **Pub/Sub pattern** to decouple the network module from in-game objects.
* **Result**: Enabled seamless system scalability where new sensors can be added by simply deploying prefabs without modifying the core source code.

### 3. Security Validation
* **Security**: Conducted Man-in-the-Middle (MITM) attack simulations, resulting in **100% detection and blocking** of tampered packets.

---

## Publications & Awards

* **Lead Author**, "Integrity Assurance System in IoT Virtual Environment Platform: Via Hyperledger Indy and MQTT," *Journal of Korea Smart Media Society*, Vol. 13, No. 4, April 2024. [Link](https://kism.or.kr/file/memoir/13_4_8.pdf)
* **Outstanding Paper Award**, "A Study on Digital Identification Technology for Decentralized Digital Ecosystems," *2023 Korea Computer Digital Contents Society (KCDCS) Fall Conference*.
* **Bronze Award**, "Development of IoT Communication Technology for Trusted Decentralized Metaverse," *2023 Korea Computer Digital Contents Society (KCDCS) Fall Conference*.