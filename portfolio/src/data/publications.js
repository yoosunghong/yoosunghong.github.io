export const publications = [
    {
        id: 'learned-coordination-conventions',
        title: 'Learned Coordination Conventions in Cooperative MARL: Measuring the Translation Gap Between Theory-Informed Roles and Learned Routing',
        authors: 'Yoosung Hong',
        venue: 'NExT-Game 2026: NEw frontiers in GAME-Theoretic learning - ICML 2026 Workshop',
        status: {
            ko: '포스터 승인',
            en: 'Poster Accepted',
        },
        date: '2026',
        image: '/papers/images/learned_condition.png',
        url: 'https://openreview.net/forum?id=JpqbBp9xzK',
        pdfUrl: '/papers/pdfs/50_Learned_Coordination_Conven.pdf',
        keywords: ['Cooperative MARL', 'Game-Theoretic Learning', 'Role-Conditioned Attention', 'Coordination', 'Equilibrium Selection'],
        description: {
            ko: '협력 MARL 에이전트가 학습으로 선택한 조정 관습이 이론 기반 역할 의미와 어떻게 어긋나거나 정렬되는지 측정하는 연구.',
            en: 'An empirical framework for measuring how learned cooperative MARL coordination conventions align with theory-informed role semantics.',
        },
        abstract: {
            ko: '역할 의미 기반 할당은 이질적 에이전트가 어떻게 협력할 수 있는지에 대한 사전 지식을 제공하지만, 협력 MARL 에이전트는 분산적이고 비정상적인 학습 과정에서 자체적인 조정 관습을 선택합니다. 이 논문은 학습된 관습이 정책 구조에서 얼마나 판독 가능한지, 그리고 이론 기반 역할 의미 사전 지식과 어떤 관계를 갖는지 분석합니다. 역할 라우팅 행렬, formation sensitivity, gradient/occlusion attribution을 결합한 진단 프레임워크를 통해 MiniGrid와 SMACv2 Terran 환경, 다섯 가지 MAPPO 조건, 3v3-9v9 스케일링 설정을 평가했습니다. 결과적으로 label-conditioned attention은 flat MLP 기준선보다 더 집중적이고 역할 특화된 라우팅을 보였고, 스케일 확장과 zero-shot transfer, ally-slot padding에 대해서도 안정적인 신호를 유지했습니다. 본 연구는 새로운 해법 개념을 제안하기보다, 협력 MARL에서 학습된 조정 구조를 실증적으로 측정하는 평가 프레임워크를 제시합니다.',
            en: 'Role-semantic assignments provide priors for how heterogeneous agents may coordinate, while cooperative MARL agents settle on conventions through decentralized, non-stationary learning. This paper asks whether the selected convention is legible from the policy architecture and how it relates to a theory-informed role-semantic prior. Using a diagnostic framework that combines a role-routing matrix, formation sensitivity, and gradient/occlusion attribution across three-role MiniGrid and SMACv2 Terran settings, five MAPPO conditions, and a 3v3-9v9 scaling study, the work finds that label-conditioned attention yields more concentrated and role-specific routing than flat MLP baselines. The routing signature remains stable under scaling, transfers zero-shot from 3v3 to 9v9 above the from-scratch baseline, and is invariant to ally-slot padding. The contribution is an empirical evaluation framework for learned coordination structure in cooperative MARL, not a new solution concept.',
        },
    },
    {
        id: 'pcsp',
        title: 'One Policy, Infinite NPCs: Scalable Persona-Conditioned NPC Control via Shared Reinforcement Learning Policies',
        authors: 'Yoosung Hong',
        venue: 'arXiv preprint',
        date: '2026.05',
        image: '/papers/images/pcsp.png',
        url: 'https://arxiv.org/abs/2605.23652',
        pdfUrl: '/papers/pdfs/main.pdf',
        keywords: ['Game AI', 'NPC Personalization', 'Reinforcement Learning', 'Persona Conditioning', 'Large Language Models'],
        description: {
            ko: '단일 공유 강화학습 정책으로 자연어 페르소나에 맞춘 NPC 행동을 실시간으로 제어하는 연구.',
            en: 'A shared reinforcement learning policy for real-time NPC control conditioned on natural-language personas.',
        },
        abstract: {
            ko: '300개 페르소나 기반 라이프 시뮬레이션 벤치마크에서 PCSP는 우연 수준보다 11배 높은 zero-shot 페르소나 식별 성능, Spearman ρ = 0.73의 의미-행동 정렬, LLM-as-policy 기준선보다 22배 빠른 추론 속도를 달성했습니다. 라이프 시뮬레이션 게임은 서로 다른 성격을 일관되게 표현하면서도 디자이너가 작성한 자연어로 제어 가능한 수백에서 수천 명의 NPC를 필요로 합니다. 본 논문은 자유 형식 페르소나 설명의 고정 LLM 임베딩을 조건으로 사용하는 단일 강화학습 정책인 PCSP(Persona-Conditioned Shared Policy)를 제안합니다. PCSP는 NPC별 1회 페르소나 인코딩, 저랭크 페르소나 투영, 신경망 페르소나 조건화, PPO + InfoNCE 일관성 + KL 다양성 학습 목표를 결합합니다. 세 가지 Mini-Inzoi 실험 설정에서 InfoNCE trajectory-consistency 목표가 zero-shot 페르소나 식별과 행동 추적 가능성에 핵심적임을 확인했습니다.',
            en: 'On a 300-persona life-simulation benchmark, PCSP achieves zero-shot persona identification 11x above chance, Spearman rho = 0.73 semantic-behavioral alignment, and 22x faster inference than an LLM-as-policy baseline. Life simulation games require hundreds to thousands of NPCs that behave consistently with distinct personalities while remaining controllable through designer-authored natural language. This paper introduces PCSP (Persona-Conditioned Shared Policy), a single reinforcement learning policy conditioned on frozen LLM embeddings of free-form persona descriptions. PCSP combines once-per-NPC persona encoding, low-rank persona projection, neural persona conditioning, and a PPO + InfoNCE consistency + KL diversity training objective. Across three Mini-Inzoi experimental settings, the results show that the InfoNCE trajectory-consistency objective is central to zero-shot persona identification and recoverable behavior traces.',
        },
    },
    {
        id: 'gobt-framework',
        title: 'GOBT: A Synergistic Approach to Game AI Using Goal-Oriented and Utility-Based Planning in Behavior Trees',
        authors: 'Yoosung Hong, Tianhao Yan, Jinseok Seo',
        venue: 'Journal of Multimedia Information System',
        date: '2023.10.04',
        image: '/papers/images/gobt.png',
        url: 'https://www.jmis.org/archive/view_article?pid=jmis-10-4-321',
        pdfUrl: '/papers/pdfs/gobt.pdf',
        keywords: ['Behavior Tree', 'GOAP', 'Utility AI', 'NPC AI'],
        description: {
            ko: 'Behavior Tree, GOAP, Utility AI를 통합한 게임 AI 의사결정 프레임워크 연구.',
            en: 'A game AI decision-making framework integrating Behavior Trees, GOAP, and Utility AI.',
        },
        abstract: {
            ko: '본 논문에서는 Unity 게임 엔진을 이용한 시뮬레이션을 통해 새로운 게임 AI 프레임워크인 목표 지향 행동 트리(Goal-Oriented Behavior Tree, GOBT)를 제안합니다. 이 프레임워크는 목표 지향 행동 계획(GOAP) 아키텍처와 효용 이론의 장점을 기존 행동 트리와 통합하여 다양한 상황에 대한 에이전트의 유연한 반응을 가능하게 합니다. 시뮬레이션 환경에는 순찰, 공격, 후퇴 등의 행동을 수행할 수 있는 사용자 정의 가능한 게임 캐릭터가 포함됩니다. GOBT를 통해 개발자는 기존 행동 트리의 논리를 적용하면서 필요에 따라 GOAP의 동적 계획 기능과 효용 기반 행동 선택을 활용할 수 있습니다. GOBT 프레임워크의 성능은 변화하는 환경 요인에 대한 에이전트 행동 합성 데이터셋을 사용한 시뮬레이션을 통해 검증되었습니다.',
            en: 'This paper proposes the Goal-Oriented Behavior Tree, a novel game AI framework verified through simulations in the Unity game engine. The framework integrates the advantages of Goal-Oriented Action Planning and Utility Theory with traditional Behavior Trees, enabling agents to respond more flexibly to changing situations. The simulated environment contains customizable game characters capable of actions such as patrol, attack, and retreat. GOBT lets developers design agent decision-making by applying traditional BT logic while using dynamic GOAP planning and utility-based action selection when needed. The framework is verified with a synthetic dataset of agent behaviors under changing environmental factors.',
        },
    },
    {
        id: 'metaverse-iot',
        title: 'Integrity Guarantee System in IoT Virtual Environment Platform: Through Hyperledger Indy and MQTT',
        authors: 'Yoosung Hong, Geun-Hyung Kim',
        venue: 'Korea Information Systems Management Conference',
        date: '2024.04.22',
        image: '/papers/images/iot.png',
        url: 'https://kism.or.kr/file/memoir/13_4_8.pdf',
        pdfUrl: '/papers/pdfs/iot.pdf',
        keywords: ['Blockchain', 'Metaverse', 'IoT', 'MQTT', 'Data Integrity'],
        description: {
            ko: 'Hyperledger Indy와 MQTT를 활용한 IoT 가상환경 플랫폼의 데이터 무결성 보장 시스템.',
            en: 'A data integrity guarantee system for IoT virtual environment platforms using Hyperledger Indy and MQTT.',
        },
        abstract: {
            ko: '본 논문에서는 Hyperledger Indy와 MQTT를 결합하여 가상환경에서 IoT 디바이스의 데이터 무결성을 높이는 시스템을 제안합니다. 이 시스템은 발행-구독 통신 패턴에서 분산형 네트워크를 활용한 DPKI 구조를 구현하여 중앙집중형 시스템의 한계를 보완합니다. IoT 디바이스의 데이터 무결성을 보장하기 위해 디지털 서명 기술을 적용했으며, 클라이언트, IoT 디바이스, 브로커, 블록체인이라는 네 가지 핵심 요소 간 통신 시나리오와 분산 식별자를 활용한 토픽 구조를 제시합니다. 제안 시스템은 네 가지 시나리오 실험과 가상환경 통신 성능 평가를 통해 신뢰성 있는 IoT 데이터 통신 구조를 제공함을 확인했습니다.',
            en: 'This paper proposes a system that enhances the data integrity of IoT devices in a virtual environment by combining Hyperledger Indy and MQTT. The system complements the limitations of centralized systems by implementing a Decentralized Public Key Infrastructure structure in pub/sub communication patterns. Digital signatures are applied to guarantee IoT data integrity, and the paper presents communication scenarios among four core elements: client, IoT device, broker, and blockchain. It also introduces a topic structure using Decentralized Identifiers for secure and transparent data exchange. Experiments across four scenarios confirm that the proposed system provides a reliable IoT data communication structure in a virtual environment.',
        },
    },
]

export const getPublicationById = (id) => publications.find((paper) => paper.id === id)
