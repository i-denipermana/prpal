/** Team detection service - discovers user's teams in an organization */

import type { GitHubClient } from './client.js'
import type { GitHubTeam } from '../../types/github.js'
import { debug, info } from '../../utils/logger.js'

export interface UserTeams {
  teams: GitHubTeam[]
  teamSlugs: string[]
}

export async function detectUserTeams(
  client: GitHubClient,
  org: string
): Promise<UserTeams> {
  debug('Detecting user teams', { org })

  const teams = await client.get<GitHubTeam[]>('/user/teams')
  const orgTeams = filterOrgTeams(teams, org)

  info(`Found ${orgTeams.length} teams in ${org}`)

  return {
    teams: orgTeams,
    teamSlugs: orgTeams.map((t) => t.slug),
  }
}

function filterOrgTeams(teams: GitHubTeam[], org: string): GitHubTeam[] {
  return teams.filter((t) => t.organization.login.toLowerCase() === org.toLowerCase())
}

export function isTeamMember(userTeams: UserTeams, teamSlug: string): boolean {
  return userTeams.teamSlugs.includes(teamSlug)
}

export function hasAnyTeam(userTeams: UserTeams, teamSlugs: string[]): boolean {
  return teamSlugs.some((slug) => userTeams.teamSlugs.includes(slug))
}
