import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { io } from 'socket.io-client';
import bcrypt from 'bcryptjs';

test('marketplace workflow, TrustScore, messages and admin access work end to end', {
  skip: !process.env.TEST_DATABASE_URL,
  timeout: 120000,
}, async () => {
  const databaseUrl = new URL(process.env.TEST_DATABASE_URL);
  assert.ok(['localhost', '127.0.0.1', '::1'].includes(databaseUrl.hostname),
    'Integration tests only allow a disposable local PostgreSQL service.');

  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.DIRECT_URL = process.env.TEST_DATABASE_URL;
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  const port = 5179;
  const base = `http://127.0.0.1:${port}`;
  const adminPassword = 'CI-Only-Admin-Password-2026!';
  let server;
  let socket;
  let teamSocket;

  const call = async (path, { method = 'GET', token, body } = {}) => {
    const response = await fetch(base + path, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, data: await response.json() };
  };

  try {
    await prisma.user.create({
      data: {
        name: 'CI Administrator',
        email: 'ci-admin@freelancehub.test',
        passwordHash: await bcrypt.hash(adminPassword, 12),
        role: 'ADMIN',
        isVerified: true,
      },
    });

    server = spawn(process.execPath, ['src/server.js'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PORT: String(port),
        NODE_ENV: 'test',
        JWT_SECRET: 'ci-only-secret-long-enough-for-integration-tests-2026',
        JWT_EXPIRES_IN: '1h',
        CLIENT_URL: 'http://localhost:5173',
        TRUST_PROXY: '0',
      },
      stdio: 'ignore',
    });

    let ready = false;
    for (let i = 0; i < 40; i += 1) {
      if (server.exitCode !== null) throw new Error('API process exited before becoming ready.');
      try {
        const response = await fetch(base + '/api/health/ready');
        if (response.ok) { ready = true; break; }
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
    assert.equal(ready, true, 'API did not become ready.');

    const client = await call('/api/auth/register', {
      method: 'POST',
      body: { name: 'CI Client', email: 'client@freelancehub.test', password: 'Client-Password-2026!', role: 'CLIENT' },
    });
    assert.equal(client.status, 201);
    const freelancer = await call('/api/auth/register', {
      method: 'POST',
      body: { name: 'CI Freelancer', email: 'freelancer@freelancehub.test', password: 'Freelancer-Password-2026!', role: 'FREELANCER' },
    });
    assert.equal(freelancer.status, 201);
    const collaborator = await call('/api/auth/register', {
      method: 'POST',
      body: { name: 'CI Collaborator', email: 'collaborator@freelancehub.test', password: 'Collaborator-Password-2026!', role: 'FREELANCER' },
    });
    assert.equal(collaborator.status, 201);
    const outsider = await call('/api/auth/register', {
      method: 'POST',
      body: { name: 'CI Outsider', email: 'outsider@freelancehub.test', password: 'Outsider-Password-2026!', role: 'FREELANCER' },
    });
    assert.equal(outsider.status, 201);
    const ct = client.data.token;
    const ft = freelancer.data.token;
    const clientId = client.data.user.id;
    const freelancerId = freelancer.data.user.id;
    const collaboratorToken = collaborator.data.token;
    const collaboratorId = collaborator.data.user.id;
    const outsiderToken = outsider.data.token;
    const outsiderId = outsider.data.user.id;

    const unsafeProfile = await call('/api/users/profile', {
      method: 'PUT', token: ft, body: { portfolioUrl: 'javascript:alert(1)' },
    });
    assert.equal(unsafeProfile.status, 400);

    const profile = await call('/api/users/profile', {
      method: 'PUT',
      token: ft,
      body: {
        bio: 'Integration test software engineer',
        location: 'India',
        website: 'https://example.com',
        headline: 'Full-stack developer',
        skills: ['React', 'Node.js'],
        hourlyRate: 800,
        experience: '4 years',
        portfolioUrl: 'https://example.com/portfolio',
      },
    });
    assert.equal(profile.status, 200);

    const project = await call('/api/projects', {
      method: 'POST',
      token: ct,
      body: {
        title: 'CI integration test website',
        description: 'Build a website and verify all marketplace workflow steps.',
        category: 'Development & IT',
        skills: ['React', 'Node.js'],
        budgetMin: 1000,
        budgetMax: 2500,
      },
    });
    assert.equal(project.status, 201);
    const projectId = project.data.project.id;
    const invalidTeamSize = await call('/api/projects', {
      method: 'POST', token: ct,
      body: {
        title: 'CI invalid team project', description: 'This project intentionally uses an unsupported team size.',
        category: 'Development & IT', budgetMin: 1000, budgetMax: 3000, teamEnabled: true, teamSize: 13,
      },
    });
    assert.equal(invalidTeamSize.status, 400);

    const teamProjectResponse = await call('/api/projects', {
      method: 'POST', token: ct,
      body: {
        title: 'CI collaborative platform build',
        description: 'Build a larger platform together using a shared team workspace and assigned work.',
        category: 'Development & IT',
        skills: ['React', 'Node.js', 'PostgreSQL'],
        budgetMin: 5000,
        budgetMax: 12000,
        teamEnabled: true,
        teamSize: 2,
      },
    });
    assert.equal(teamProjectResponse.status, 201);
    const teamProjectId = teamProjectResponse.data.project.id;
    assert.equal(teamProjectResponse.data.project.teamEnabled, true);
    assert.equal(teamProjectResponse.data.project.teamSize, 2);

    const firstInvite = await call(`/api/teams/${teamProjectId}/invitations`, {
      method: 'POST', token: ct, body: { freelancerId, roleLabel: 'Frontend lead' },
    });
    assert.equal(firstInvite.status, 201);
    const firstMemberId = firstInvite.data.invitation.id;
    const pendingTeam = await call(`/api/teams/${teamProjectId}`, { token: ft });
    assert.equal(pendingTeam.status, 200);
    assert.equal(pendingTeam.data.access.invitation.id, firstMemberId);
    assert.equal(pendingTeam.data.tasks.length, 0);

    const secondInvite = await call(`/api/teams/${teamProjectId}/invitations`, {
      method: 'POST', token: ct, body: { freelancerId: collaboratorId, roleLabel: 'Backend developer' },
    });
    assert.equal(secondInvite.status, 201);
    const secondMemberId = secondInvite.data.invitation.id;

    const acceptSecond = await call(`/api/teams/${teamProjectId}/invitations/${secondMemberId}`, {
      method: 'PATCH', token: collaboratorToken, body: { response: 'ACCEPTED' },
    });
    assert.equal(acceptSecond.status, 200);
    assert.equal(acceptSecond.data.membership.status, 'ACCEPTED');
    const acceptFirst = await call(`/api/teams/${teamProjectId}/invitations/${firstMemberId}`, {
      method: 'PATCH', token: ft, body: { response: 'ACCEPTED' },
    });
    assert.equal(acceptFirst.status, 200);

    const fullTeamInvite = await call(`/api/teams/${teamProjectId}/invitations`, {
      method: 'POST', token: ct, body: { freelancerId: outsiderId, roleLabel: 'QA tester' },
    });
    assert.equal(fullTeamInvite.status, 409);
    const duplicateInvite = await call(`/api/teams/${teamProjectId}/invitations`, {
      method: 'POST', token: ct, body: { freelancerId, roleLabel: 'Frontend developer' },
    });
    assert.equal(duplicateInvite.status, 409);

    const teamListForFreelancer = await call('/api/teams', { token: collaboratorToken });
    assert.ok(teamListForFreelancer.data.items.some((item) => item.project.id === teamProjectId));
    const teamDetails = await call(`/api/teams/${teamProjectId}`, { token: ct });
    assert.equal(teamDetails.status, 200);
    assert.equal(teamDetails.data.members.filter((member) => member.status === 'ACCEPTED').length, 2);

    const createTeamTask = await call(`/api/teams/${teamProjectId}/tasks`, {
      method: 'POST', token: ct,
      body: { title: 'Build API integration', description: 'Connect the core project endpoints.', assigneeId: collaboratorId },
    });
    assert.equal(createTeamTask.status, 201);
    const teamTaskId = createTeamTask.data.task.id;
    const unassignedUpdate = await call(`/api/teams/${teamProjectId}/tasks/${teamTaskId}`, {
      method: 'PATCH', token: ft, body: { status: 'IN_PROGRESS' },
    });
    assert.equal(unassignedUpdate.status, 403);
    const outsiderTeamAccess = await call(`/api/teams/${teamProjectId}`, { token: outsiderToken });
    assert.equal(outsiderTeamAccess.status, 404);
    const outsiderTaskUpdate = await call(`/api/teams/${teamProjectId}/tasks/${teamTaskId}`, {
      method: 'PATCH', token: outsiderToken, body: { status: 'DONE' },
    });
    assert.equal(outsiderTaskUpdate.status, 404);
    const updateTeamTask = await call(`/api/teams/${teamProjectId}/tasks/${teamTaskId}`, {
      method: 'PATCH', token: collaboratorToken, body: { status: 'IN_PROGRESS' },
    });
    assert.equal(updateTeamTask.status, 200);
    assert.equal(updateTeamTask.data.task.status, 'IN_PROGRESS');

    teamSocket = io(base, { auth: { token: collaboratorToken }, transports: ['websocket'], reconnection: false });
    await new Promise((resolve, reject) => {
      teamSocket.once('connect', resolve);
      teamSocket.once('connect_error', reject);
    });
    const teamRealtime = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('No real-time team message received.')), 10000);
      teamSocket.once('team:message:new', (event) => { clearTimeout(timer); resolve(event); });
    });
    const teamMessage = await call(`/api/teams/${teamProjectId}/messages`, {
      method: 'POST', token: ct, body: { content: 'Welcome to the project team. Please share progress here.' },
    });
    assert.equal(teamMessage.status, 201);
    const teamMessageEvent = await teamRealtime;
    assert.equal(teamMessageEvent.message.id, teamMessage.data.message.id);
    const refreshedTeam = await call(`/api/teams/${teamProjectId}`, { token: collaboratorToken });
    assert.ok(refreshedTeam.data.messages.some((message) => message.content.includes('Welcome to the project team')));

    const removeMember = await call(`/api/teams/${teamProjectId}/members/${firstMemberId}`, {
      method: 'DELETE', token: ct,
    });
    assert.equal(removeMember.status, 200);
    const thirdInvite = await call(`/api/teams/${teamProjectId}/invitations`, {
      method: 'POST', token: ct, body: { freelancerId: outsiderId, roleLabel: 'QA tester' },
    });
    assert.equal(thirdInvite.status, 201);
    const pendingAssignment = await call(`/api/teams/${teamProjectId}/tasks`, {
      method: 'POST', token: ct,
      body: { title: 'Pending member cannot be assigned', assigneeId: outsiderId },
    });
    assert.equal(pendingAssignment.status, 400);
    const declineInvite = await call(`/api/teams/${teamProjectId}/invitations/${thirdInvite.data.invitation.id}`, {
      method: 'PATCH', token: outsiderToken, body: { response: 'DECLINED' },
    });
    assert.equal(declineInvite.status, 200);
    assert.equal(declineInvite.data.membership.status, 'DECLINED');
    const declinedAccess = await call(`/api/teams/${teamProjectId}`, { token: outsiderToken });
    assert.equal(declinedAccess.status, 404);
    // A freelancer accepted through the normal proposal workflow must also
    // appear as an accepted member in both client and freelancer team views.
    const proposalTeamProject = await call('/api/projects', {
      method: 'POST', token: ct,
      body: {
        title: 'CI proposal-approved team project',
        description: 'A group project where a freelancer applies and is approved through proposals.',
        category: 'Development & IT',
        skills: ['React', 'API'],
        budgetMin: 4000,
        budgetMax: 9000,
        teamEnabled: true,
        teamSize: 2,
      },
    });
    assert.equal(proposalTeamProject.status, 201);
    const proposalTeamProjectId = proposalTeamProject.data.project.id;

    const teamApplication = await call(`/api/proposals/project/${proposalTeamProjectId}`, {
      method: 'POST', token: outsiderToken,
      body: {
        coverLetter: 'I would like to join this collaborative project.',
        bidAmount: 6000,
        deliveryDays: 21,
      },
    });
    assert.equal(teamApplication.status, 201);

    const approvedTeamApplication = await call(`/api/proposals/${teamApplication.data.proposal.id}/status`, {
      method: 'PATCH', token: ct, body: { status: 'ACCEPTED' },
    });
    assert.equal(approvedTeamApplication.status, 200);
    assert.equal(approvedTeamApplication.data.membership.status, 'ACCEPTED');
    assert.equal(approvedTeamApplication.data.membership.freelancerId, outsiderId);
    const approvedTeamNotifications = await call('/api/notifications', { token: outsiderToken });
    assert.ok(approvedTeamNotifications.data.items.some((item) =>
      item.title === 'You joined the project team' && item.link === `/app/teams/${proposalTeamProjectId}`));

    const clientTeamListAfterApproval = await call('/api/teams', { token: ct });
    const clientTeamListItem = clientTeamListAfterApproval.data.items.find((item) => item.project.id === proposalTeamProjectId);
    assert.ok(clientTeamListItem, 'Approved group project should appear in the client team list.');
    assert.equal(clientTeamListItem.project._count.teamMembers, 1);

    const freelancerTeamListAfterApproval = await call('/api/teams', { token: outsiderToken });
    const freelancerTeamListItem = freelancerTeamListAfterApproval.data.items.find((item) => item.project.id === proposalTeamProjectId);
    assert.ok(freelancerTeamListItem, 'Approved freelancer should see the group project in Team Projects.');
    assert.equal(freelancerTeamListItem.membership.status, 'ACCEPTED');

    const clientTeamDetailsAfterApproval = await call(`/api/teams/${proposalTeamProjectId}`, { token: ct });
    assert.ok(clientTeamDetailsAfterApproval.data.members.some((member) =>
      member.freelancerId === outsiderId && member.status === 'ACCEPTED'));
    const freelancerTeamDetailsAfterApproval = await call(`/api/teams/${proposalTeamProjectId}`, { token: outsiderToken });
    assert.ok(freelancerTeamDetailsAfterApproval.data.members.some((member) =>
      member.freelancerId === outsiderId && member.status === 'ACCEPTED'));



    const invalidPage = await call('/api/projects?page=invalid');
    assert.equal(invalidPage.status, 400);
    const search = await call('/api/projects?q=CI%20integration&skill=React');
    assert.ok(search.data.items.some((item) => item.id === projectId));

    const saved = await call(`/api/projects/${projectId}/save`, { method: 'POST', token: ft });
    assert.equal(saved.data.saved, true);
    const proposal = await call(`/api/proposals/project/${projectId}`, {
      method: 'POST',
      token: ft,
      body: { coverLetter: 'I can deliver this work.', bidAmount: 1800, deliveryDays: 14 },
    });
    assert.equal(proposal.status, 201);
    const accepted = await call(`/api/proposals/${proposal.data.proposal.id}/status`, {
      method: 'PATCH', token: ct, body: { status: 'ACCEPTED' },
    });
    assert.equal(accepted.status, 200);
    const contractId = accepted.data.contract.id;

    const submitWithoutFile = await call(`/api/contracts/${contractId}/status`, {
      method: 'PATCH', token: ft, body: { status: 'SUBMITTED' },
    });
    assert.equal(submitWithoutFile.status, 400);

    const workFile = Buffer.from('FreelanceHub deliverable test file');
    const uploadResponse = await fetch(`${base}/api/contracts/${contractId}/deliverables`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${ft}`,
        'Content-Type': 'application/octet-stream',
        'X-File-Name': encodeURIComponent('completed-work.txt'),
        'X-File-Type': 'text/plain',
      },
      body: workFile,
    });
    assert.equal(uploadResponse.status, 201);
    const uploaded = await uploadResponse.json();
    assert.equal(uploaded.deliverable.fileName, 'completed-work.txt');

    const clientDownload = await fetch(`${base}/api/contracts/${contractId}/deliverables/${uploaded.deliverable.id}/download`, {
      headers: { Authorization: `Bearer ${ct}` },
    });
    assert.equal(clientDownload.status, 200);
    assert.equal(Buffer.from(await clientDownload.arrayBuffer()).toString(), workFile.toString());

    const milestone = await call(`/api/contracts/${contractId}/milestones`, {
      method: 'POST', token: ct,
      body: { title: 'First delivery', amount: 1800 },
    });
    assert.equal(milestone.status, 201);
    const milestoneId = milestone.data.milestone.id;
    for (const [token, status] of [[ft, 'IN_PROGRESS'], [ft, 'SUBMITTED'], [ct, 'APPROVED']]) {
      const result = await call(`/api/contracts/milestones/${milestoneId}/status`, {
        method: 'PATCH', token, body: { status },
      });
      assert.equal(result.status, 200);
    }

    const submitted = await call(`/api/contracts/${contractId}/status`, {
      method: 'PATCH', token: ft, body: { status: 'SUBMITTED' },
    });
    assert.equal(submitted.status, 200);
    const completed = await call(`/api/contracts/${contractId}/status`, {
      method: 'PATCH', token: ct, body: { status: 'COMPLETED' },
    });
    assert.equal(completed.data.contract.status, 'COMPLETED');

    const review = await call('/api/reviews', {
      method: 'POST', token: ct,
      body: { contractId, rating: 5, comment: 'Excellent integration test delivery.' },
    });
    assert.equal(review.status, 201);
    const score = await call('/api/users/me/trust-score', { token: ft });
    assert.equal(score.status, 200);
    assert.equal(score.data.trustScore.score, 100);

    socket = io(base, { auth: { token: ft }, transports: ['websocket'], reconnection: false });
    await new Promise((resolve, reject) => {
      socket.once('connect', resolve);
      socket.once('connect_error', reject);
    });
    const invalidMessage = await call(`/api/messages/${freelancerId}`, {
      method: 'POST', token: ct, body: { content: 42 },
    });
    assert.equal(invalidMessage.status, 400);

    const oversizedMessage = await call(`/api/messages/${freelancerId}`, {
      method: 'POST', token: ct, body: { content: 'x'.repeat(4001) },
    });
    assert.equal(oversizedMessage.status, 400);

    const realtime = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('No real-time message received.')), 10000);
      socket.once('message:new', (message) => { clearTimeout(timer); resolve(message); });
    });

    const sent = await call(`/api/messages/${freelancerId}`, {
      method: 'POST', token: ct, body: { content: 'Hello from the client.' },
    });
    assert.equal(sent.status, 201);
    const received = await realtime;
    assert.equal(received.id, sent.data.message.id);

    const unread = await call('/api/messages/conversations', { token: ft });
    assert.equal(unread.data.items.find((item) => item.user.id === clientId).unread, 1);
    const thread = await call(`/api/messages/${clientId}`, { token: ft });
    assert.ok(thread.data.items.some((item) => item.content === 'Hello from the client.'));
    const read = await call('/api/messages/conversations', { token: ft });
    assert.equal(read.data.items.find((item) => item.user.id === clientId).unread, 0);

    const adminLogin = await call('/api/auth/login', {
      method: 'POST', body: { email: 'ci-admin@freelancehub.test', password: adminPassword },
    });
    assert.equal(adminLogin.status, 200);
    const forbidden = await call('/api/admin/users', { token: ct });
    assert.equal(forbidden.status, 403);
    const adminUsers = await call('/api/admin/users', { token: adminLogin.data.token });
    assert.equal(adminUsers.status, 200);
    assert.ok(adminUsers.data.items.some((item) => item.id === freelancerId));

    const socketDisconnected = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Suspended account retained its Socket.IO connection.')), 5000);
      socket.once('disconnect', (reason) => { clearTimeout(timer); resolve(reason); });
    });
    const deactivate = await call(`/api/admin/users/${freelancerId}/status`, {
      method: 'PATCH',
      token: adminLogin.data.token,
      body: { isActive: false },
    });
    assert.equal(deactivate.status, 200);
    assert.equal(deactivate.data.user.isActive, false);
    await socketDisconnected;

    const revokedSession = await call('/api/auth/me', { token: ft });
    assert.equal(revokedSession.status, 401);

    const missingAuth = await call('/api/contracts/mine');
    assert.equal(missingAuth.status, 401);
    const readyResponse = await fetch(base + '/api/health/ready');
    assert.equal(readyResponse.status, 200);
  } finally {
    socket?.disconnect();
    teamSocket?.disconnect();
    if (server && server.exitCode === null) {
      server.kill('SIGTERM');
      await new Promise((resolve) => {
        const timer = setTimeout(resolve, 3000);
        server.once('exit', () => { clearTimeout(timer); resolve(); });
      });
      if (server.exitCode === null) server.kill('SIGKILL');
    }
    await prisma.$disconnect();
  }
});
