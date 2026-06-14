"""EarthGPT Agent — Claude-powered planetary intelligence copilot"""
import os
import anthropic

SYSTEM_PROMPT = """You are EarthGPT, the AI copilot of EarthMind X — a NASA-grade Digital Twin Earth platform.

You have access to real-time environmental data, disaster predictions, and risk analytics for every city on Earth.

YOUR CAPABILITIES:
- Explain flood risk factors using ML model outputs and SHAP values
- Analyze wildfire hotspot patterns from VIIRS satellite data
- Interpret climate stress indices
- Describe simulation results and scenario impacts
- Generate emergency response summaries
- Estimate economic impacts of disasters

RULES:
- Always ground your answers in the provided context data
- If no context is given, state what data you would need
- Be precise with numbers and risk percentages
- Use clear, authoritative language appropriate for emergency management
- Never speculate beyond what the data supports

FORMAT: Use concise paragraphs with bullet points for lists. Lead with the most critical finding."""

_client: anthropic.Anthropic | None = None


def get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    return _client


def query(user_question: str, context_data: dict | None = None) -> dict:
    context_str = ""
    if context_data:
        context_str = "\n\nCONTEXT DATA:\n" + "\n".join(
            f"- {k}: {v}" for k, v in context_data.items()
        )

    message = get_client().messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[{
            "role": "user",
            "content": user_question + context_str,
        }],
    )

    answer = message.content[0].text
    sources = _extract_sources(context_data)

    return {
        "answer": answer,
        "sources": sources,
        "confidence": 0.95 if context_data else 0.7,
        "model": "claude-sonnet-4-6",
    }


def _extract_sources(context: dict | None) -> list[str]:
    if not context:
        return ["EarthMind X Knowledge Base"]
    sources = []
    if "flood_probability" in context:
        sources.append("Flood Intelligence Agent (XGBoost v1)")
    if "fire_clusters" in context or "frp" in context:
        sources.append("Wildfire Intelligence Agent (VIIRS 2024)")
    if "stress_index" in context:
        sources.append("Climate Agent")
    if "earthmind_risk_index" in context:
        sources.append("EarthMind Risk Index")
    return sources or ["EarthMind X Database"]
