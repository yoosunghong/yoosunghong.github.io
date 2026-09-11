import pcspKoContent from '../../../content/projects/pcsp.ko.md?raw'
import pcspEnContent from '../../../content/projects/pcsp.en.md?raw'

const pcsp = {
    "id": 6,
    "slug": "pcsp",
    "title": {
        "ko": "PCSP: 페르소나 기반 대규모 NPC 제어 시뮬레이션",
        "en": "PCSP: Persona-Conditioned Large-Scale NPC Simulation"
    },
    "description": {
        "ko": "텍스트 페르소나로 조건화된 하나의 공유 강화학습 정책과 UE5 Mass로 1,024 NPC의 행동을 제어하는 시뮬레이션",
        "en": "A UE5 simulation controlling 1,024 NPCs with one shared reinforcement-learning policy conditioned on text personas"
    },
    "image": "/images/pcsp/fig1_mainview.png",
    "gif": "/gifs/pcsp/main.gif",
    "detailImage": "/gifs/pcsp/main.gif",
    "period": "2026.02 - 2026.05",
    "team": {
        "ko": "1명",
        "en": "1 person"
    },
    "role": {
        "ko": "연구 설계, 강화학습 파이프라인, UE5 통합 및 성능 최적화",
        "en": "Research design, RL pipeline, UE5 integration, and performance optimization"
    },
    "tags": [
        "Unreal Engine 5.8",
        "Reinforcement Learning",
        "PPO",
        "Mass Entity",
        "ONNX"
    ],
    "github": "https://github.com/yoosunghong/pcsp",
    "paper": "https://arxiv.org/abs/2605.23652",
    "youtube": "https://youtu.be/rzPhIyn5MN0",
    "highlights": {
        "ko": [
            "33차원 관측과 64차원 페르소나를 입력받아 20개 의미 행동을 선택하는 공유 Actor-Critic 정책 설계",
            "PPO에 InfoNCE 궤적 정렬과 정책 다양성 목적을 결합하고 제거 실험·독립 평가·인간 파일럿으로 효과 범위를 검증",
            "UE5 Mass, 인스턴싱, 비동기 동적 배치 추론으로 1,024 NPC 실행 구조와 재현 가능한 런타임 계측 도구 구축"
        ],
        "en": [
            "Designed a shared Actor-Critic policy that maps a 33D observation and 64D persona to 20 semantic actions",
            "Combined PPO with InfoNCE trajectory alignment and a policy-diversity objective, then bounded the claims with ablations, independent evaluation, and a human pilot",
            "Built a 1,024-NPC execution stack and reproducible runtime instrumentation using UE5 Mass, instancing, and asynchronous dynamic-batch inference"
        ]
    },
    "content": {
        "ko": pcspKoContent,
        "en": pcspEnContent,
    }
}

export default pcsp
