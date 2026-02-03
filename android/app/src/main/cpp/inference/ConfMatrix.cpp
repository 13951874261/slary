#include "ConfMatrix.h"
#include <fstream>
#include <iostream>
#include <sstream>
#include <vector>
#include <string>
#include <unordered_map>
#include <algorithm>
#include <cmath>

namespace silenceguard {

namespace {
// Simple manual JSON parser for structure: {"key": ["v1", "v2"], ...}
// Avoids huge dependencies like jsoncpp for this specific use case.
std::unordered_map<std::string, std::vector<std::string>> g_conf_matrix;

std::string trim(const std::string& str) {
    size_t first = str.find_first_not_of(" \t\n\r\"");
    if (std::string::npos == first) return str;
    size_t last = str.find_last_not_of(" \t\n\r\"");
    return str.substr(first, (last - first + 1));
}

void parseJson(const std::string& json) {
    g_conf_matrix.clear();
    size_t pos = 0;
    while (pos < json.length()) {
        // Find key
        size_t keyStart = json.find('"', pos);
        if (keyStart == std::string::npos) break;
        size_t keyEnd = json.find('"', keyStart + 1);
        if (keyEnd == std::string::npos) break;
        
        std::string key = json.substr(keyStart + 1, keyEnd - keyStart - 1);
        
        // Find array start
        size_t arrayStart = json.find('[', keyEnd);
        if (arrayStart == std::string::npos) break;
        
        // Find array end
        size_t arrayEnd = json.find(']', arrayStart);
        if (arrayEnd == std::string::npos) break;
        
        // Parse array elements
        std::vector<std::string> values;
        size_t valStart = arrayStart + 1;
        while (valStart < arrayEnd) {
            size_t vStart = json.find('"', valStart);
            if (vStart == std::string::npos || vStart > arrayEnd) break;
            size_t vEnd = json.find('"', vStart + 1);
            if (vEnd == std::string::npos) break;
            values.push_back(json.substr(vStart + 1, vEnd - vStart - 1));
            valStart = vEnd + 1;
        }
        g_conf_matrix[key] = values;
        pos = arrayEnd + 1;
    }
}

// Levenshtein Distance
int editDistance(const std::string& s1, const std::string& s2) {
    const size_t m = s1.length();
    const size_t n = s2.length();
    if (m == 0) return n;
    if (n == 0) return m;

    std::vector<std::vector<int>> dp(m + 1, std::vector<int>(n + 1));

    for (size_t i = 0; i <= m; ++i) dp[i][0] = i;
    for (size_t j = 0; j <= n; ++j) dp[0][j] = j;

    for (size_t i = 1; i <= m; ++i) {
        for (size_t j = 1; j <= n; ++j) {
            int cost = (s1[i - 1] == s2[j - 1]) ? 0 : 1;
            dp[i][j] = std::min({
                dp[i - 1][j] + 1,      // deletion
                dp[i][j - 1] + 1,      // insertion
                dp[i - 1][j - 1] + cost // substitution
            });
        }
    }
    return dp[m][n];
}

} // namespace

bool loadConfMatrix(const char* path) {
    if (!path) return false;
    std::ifstream file(path);
    if (!file.is_open()) return false;
    
    std::stringstream buffer;
    buffer << file.rdbuf();
    parseJson(buffer.str());
    return !g_conf_matrix.empty();
}

int getPhonemeVariants(const char* target, const char** outVariants, int maxOut) {
    if (!target || !outVariants || maxOut <= 0) return 0;
    
    std::string key(target);
    if (g_conf_matrix.find(key) == g_conf_matrix.end()) return 0;
    
    const auto& vars = g_conf_matrix[key];
    int count = 0;
    for (const auto& v : vars) {
        if (count >= maxOut) break;
        // WARNING: Returning internal string c_str() requires map to outlive usage
        // For static usage this is acceptable, but be careful with threads
        outVariants[count++] = v.c_str(); 
    }
    return count;
}

// Placeholder for Phase 2: Currently assumes input is already phoneme strings
// Real implementation would decode posteriors to phonemes first.
float calculatePhonemeSimilarity(const float* posteriorsA, int lenA,
                                const float* posteriorsB, int lenB) {
    // Stub: Treat pointer address as string data for now to compile
    // In real implementation: Decode argmax(posteriors) -> phoneme string
    (void)posteriorsA; (void)lenA; (void)posteriorsB; (void)lenB;
    return 0.0f; 
}
// Bridge for direct string comparison (similar to JS implementation)
float calculateStringSimilarity(const char* s1, const char* s2) {
    std::string a(s1);
    std::string b(s2);
    if (a == b) return 1.0f;
    int dist = editDistance(a, b);
    int maxLen = std::max(a.length(), b.length());
    if (maxLen == 0) return 1.0f;
    return 1.0f - (float)dist / maxLen;
}

}  // namespace silenceguard
