/**
 * Cloudflare Worker для отправки заявок в Telegram
 *
 * Environment variables (set in Cloudflare dashboard):
 * - TELEGRAM_BOT_TOKEN: токен бота от BotFather
 * - TELEGRAM_CHAT_ID: твой chat ID (получи от @userinfobot)
 */

export default {
  async fetch(request, env) {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Only allow POST
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({
        success: false,
        message: 'Method not allowed'
      }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    try {
      // Parse form data
      const data = await request.json();

      // Validate required fields
      const { name, email, github, team, usecase } = data;

      if (!name || !email || !github || !team) {
        return new Response(JSON.stringify({
          success: false,
          message: 'Missing required fields'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Validate team name (k8s naming)
      const teamNameRegex = /^[a-z0-9][a-z0-9-]{0,62}$/;
      if (!teamNameRegex.test(team)) {
        return new Response(JSON.stringify({
          success: false,
          message: 'Invalid team name format'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Validate GitHub username
      const githubRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]){0,38}$/;
      if (!githubRegex.test(github)) {
        return new Response(JSON.stringify({
          success: false,
          message: 'Invalid GitHub username'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Build Telegram message
      const message = `
🚀 *New mctl.me Access Request*

👤 *Name:* ${escapeMarkdown(name)}
📧 *Email:* ${escapeMarkdown(email)}
🐙 *GitHub:* @${escapeMarkdown(github)}
🏷 *Team:* \`${escapeMarkdown(team)}\`
📝 *Use Case:* ${escapeMarkdown(usecase || 'Not specified')}

⏰ *Submitted:* ${new Date().toISOString()}

---

*Next Steps:*
\`\`\`bash
# 1. Create GitHub team
gh api /orgs/dmitriimashkov/teams \\
  -f name=${team} \\
  -f privacy=secret

# 2. Invite user
gh api /orgs/dmitriimashkov/teams/${team}/memberships/${github} \\
  -X PUT -f role=member

# 3. Trigger RBAC sync
gh workflow run sync-argocd-teams.yml
\`\`\`

✅ User will get:
• Namespace: \`${team}\`
• ArgoCD access: \`preview-${team}-*\`
• Backstage login via GitHub OAuth
      `.trim();

      // Send to Telegram
      const telegramUrl = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;

      const telegramResponse = await fetch(telegramUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: env.TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: 'Markdown',
        }),
      });

      if (!telegramResponse.ok) {
        const error = await telegramResponse.text();
        console.error('Telegram API error:', error);
        throw new Error('Failed to send Telegram message');
      }

      // Success response
      return new Response(JSON.stringify({
        success: true,
        message: '✅ SUCCESS: Request submitted! You will be contacted soon.'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Error:', error);
      return new Response(JSON.stringify({
        success: false,
        message: 'Failed to submit request. Please try again.'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

// Escape special characters for Telegram Markdown
function escapeMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/_/g, '\\_')
    .replace(/\*/g, '\\*')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/~/g, '\\~')
    .replace(/`/g, '\\`')
    .replace(/>/g, '\\>')
    .replace(/#/g, '\\#')
    .replace(/\+/g, '\\+')
    .replace(/-/g, '\\-')
    .replace(/=/g, '\\=')
    .replace(/\|/g, '\\|')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/\./g, '\\.')
    .replace(/!/g, '\\!');
}
