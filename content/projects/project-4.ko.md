---
title: "블록체인 기반 메타버스 IoT 통신 플랫폼"
description: "가상환경-실제 디바이스 간 데이터 무결성 보장 및 실시간 최적화"
weight: 4
translationKey: "project-4"

duration: "2022.10 ~ 2023.12"
team_size: "1 people"
role: "메인 프로그래머, 논문 작성"
github: "https://github.com/yoosunghong/Metaverse_for_IoT/tree/main/Decentralized_MQTT"
paper: "https://kism.or.kr/file/memoir/13_4_8.pdf"
math: true
---

---

## 개요 (Overview)

본 프로젝트는 메타버스 환경과 실제 IoT 기기 간의 안전하고 효율적인 데이터 통신을 위한 분산형 플랫폼을 목표로 합니다. DID(Decentralized Identifier)를 활용한 신원 검증과 MQTT 프로토콜을 통한 실시간 데이터 전송을 결합하여, 데이터의 무결성을 보장하면서도 낮은 지연 시간으로 상호작용을 구현했습니다. 또한 탈중앙 신원 관리를 위해 Hyperledger Indy 기반의 DID 원장을 활용하여 참여 주체의 신뢰 가능한 식별과 검증 가능한 자격 증명 관리를 구현했습니다.


{{< img src="/images/project3/overview.png" 
        alt="개요 이미지" 
        class="max-w-3xl" 
        caption="그림 1. 아키텍처 다이어그램" >}}

---
## 기술 스택 (Tech Stack)

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


## 주요 기능 (Key Features)


### 1. Hyperledger Indy 기반 분산 신원 관리 (DID/VC)
**"사용자 중심의 신원 주권 확보 및 기기 소유권 증명"**

* **자기주권신원(SSI) 실현**: 중앙 서버의 통제 없이 사용자가 직접 신원을 소유하고 통제하는 Hyperledger Indy 기반의 DID 시스템을 구축했습니다.

* **신뢰 기반 상호작용**: 검증 가능한 자격 증명(VC, Verifiable Credentials)을 통해 메타버스 내 아바타와 실제 IoT 기기 간의 소유 관계를 증명하고, 데이터 통신 시 프라이버시를 보호합니다.


{{< img src="/images/project4/vonnet.png" 
        alt="본넷 이미지" 
        class="max-w-xl" 
        caption="그림 2. VonNet에서 확인된 디바이스의 DID와 공개키" >}}


---

### 2. DPKI 기반 IoT 데이터 무결성 검증 체계
* **계층형 토픽 설계**: `home/devices/{DID}/{Sensor_Name}` 구조의 MQTT 토픽을 설계하여, 메시지 라우팅 경로 내에 디바이스 식별자(DID)를 내재화했습니다.

* **실시간 무결성 보장**: Unity 클라이언트가 수신한 토픽에서 DID를 추출, 블록체인 네트워크 상의 공개키(Public Key)를 실시간 조회하여 데이터 서명을 검증합니다.

* **보안 아키텍처**: 데이터 전송 구간 내 위변조를 원천 차단하는 DPKI(Decentralized PKI) 구조를 통해 데이터의 신뢰성을 확보했습니다.

{{< side-by-side src="/images/project4/sensor.png" caption="그림 3. 실험에 사용된 센서" >}}

| 센서 종류 | 토픽 |
| :--- | :---: |
| **초음파 센서** | home/devices/{device DID}/ultrasonic |
| **LED 전구** | home/devices/{device DID}/led |
| **온도 센서** | home/devices/{device DID}/tem | 

{{< /side-by-side >}}

---

### 3. MQTT 표준 기반 커스텀 패킷 프로토콜
* **표준 규격 준수**: MQTT v3.1.1 표준 패킷 구조(Fixed/Variable Header, Payload)를 준수하여 기존 브로커 인프라와의 상호 운용성을 확보했습니다.

* **출처 식별 자동화**: 가변 헤더(Variable Header) 내 DID가 포함된 Topic Name을 위치시켜, 데이터 해석 전 단계에서 출처를 명확히 식별(Provenance)하도록 최적화했습니다.

* **보안 패키징**: 페이로드 영역을 `[Raw Data + Digital Signature]`로 구조화하여, 데이터 수신 즉시 개별 메시지의 진위 여부를 판단할 수 있도록 설계했습니다.

{{< img src="/images/project4/packet.png" 
        alt="패킷 이미지" 
        class="max-w-xl" 
        caption="그림 4. 사용된 메시지 포멧" >}}


---

### 4. 실감형 메타버스 통합 인터페이스
**"디지털 트윈 기반의 직관적 IoT 제어 환경 제공"**

* **Unity 엔진 통합**: 메타버스 환경 내에서 실제 IoT 기기의 상태를 실시간 동기화하여 시각화했습니다.

* **직관적 UI/UX**: 아바타를 통한 기기 제어 및 데이터 흐름 시각화를 구현하여, 사용자에게 실제 기기와 상호작용하는 듯한 몰입형 모니터링 경험을 제공합니다.


{{< img src="/images/project4/unity.png" 
        alt="유니티 이미지" 
        class="max-w-md" 
        caption="그림 5. 유니티 환경" >}}

---

## 주요 문제 해결 과정 (Problem Solving)

### 1. 고성능 비동기 검증 파이프라인 설계 (성능 최적화)

* **Problem**: 매 프레임 발생하는 블록체인 조회(I/O)와 서명 검증(CPU) 연산으로 인해 메인 스레드 병목 및 **프레임 드랍(Hiccup)** 발생.
* **Solution**: Task 기반 비동기 패턴(Async/Await)을 적용하여 네트워크 수신-데이터 검증-UI 반영 스레드를 분리.
* **Result**: 보안 레이어 추가 후에도 순수 MQTT 대비 추가 지연 시간을 4.3ms 이내로 최적화하며 60 FPS 환경 사수.

{{< img-grid 
    src1="/images/project4/case1.png" cap1="그림 6. 최적화 전(블로킹 발생)"
    class1="w-2/4" 

    src2="/images/project4/case2.png" cap2="그림 7. 최적화 후(비동기 처리)"
    class1="w-3/4" 

    class="max-w-full" 
>}}

<br>

### 이벤트 기반 계층형 토픽 구조 설계 (유연한 확장성)

* **Problem:** 런타임 중 디바이스의 잦은 이탈/접속과 디바이스 종류 증가에 따른 코드 간 강한 결합도 발생.
* **Solution**: `home/devices/{DID}/{Sensor}` 형태의 **계층형 MQTT 토픽** 설계로 라우팅 자동화.
    * **Pub/Sub 패턴**을 활용하여 네트워크 모듈과 인게임 오브젝트 간 의존성 제거(Decoupling).
* **Result:** 새로운 센서 추가 시 코드 수정 없이 프리팹 배치만으로 시스템 확장 가능.

<br>

### 보안성 검증
* **Security:** 중간자 공격(MITM) 시나리오 테스트 결과, 변조 패킷 **100% 탐지 및 차단**.


---

## 결과 (Results)
* [한국스마트미디어학회 2024년 4월호 4권 ‘IoT 가상환경 플랫폼에서의 무결성 보장 시스템:HyperledgerIndy와 MQTT를 통하여’ ](https://kism.or.kr/file/memoir/13_4_8.pdf) 제 1저자 투고 및 출판 완료.
* **2023 한국디지털콘텐츠학회 추계종합학술대회 우수논문상**: ‘탈중앙 디지털 생태계를 위한 디지털 신원확인 기술에 관한 연구’ 
* **2023 한국디지털콘텐츠학회 추계종합학술대회 동상**: ‘신뢰할 수 있는 탈중앙 메타버스를 위한 IoT 통신기술 개발’ 
* **역할**: 메인 프로그래머, 논문 작성


<br>