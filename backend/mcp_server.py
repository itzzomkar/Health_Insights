from mcp.server.fastmcp import FastMCP

# [KAGGLE CAPSTONE: MCP SERVER INTEGRATION]
# We utilize the Model Context Protocol (MCP) to standardize tool interactions.
# This FastMCP server exposes critical medical utilities (like ICD-10 lookups and legal disclaimers)
# that can be securely accessed by any MCP-compliant AI client, decoupling tool logic from the LLM.
mcp = FastMCP("Health Insights MCP")

@mcp.tool()
def get_medical_disclaimer() -> str:
    """Returns the official legal medical disclaimer for Health Insights."""
    return (
        "DISCLAIMER: Health Insights is an AI tool and not a doctor. "
        "All analysis is for informational purposes only and does not constitute medical advice. "
        "Always consult with a qualified healthcare provider for medical diagnosis and treatment."
    )

@mcp.tool()
def lookup_icd10_code(condition: str) -> str:
    """Look up ICD-10 medical billing codes for common conditions."""
    codes = {
        "hypertension": "I10 - Essential (primary) hypertension",
        "diabetes": "E11.9 - Type 2 diabetes mellitus without complications",
        "asthma": "J45.909 - Unspecified asthma, uncomplicated",
        "migraine": "G43.909 - Migraine, unspecified, not intractable"
    }
    return codes.get(condition.lower().strip(), f"No ICD-10 code found for '{condition}'.")

if __name__ == "__main__":
    print("Starting Health Insights MCP Server...")
    # Run the server using standard input/output (stdio) transport
    mcp.run(transport='stdio')
