// Class Booking Ops — dependency-free front-end (no frameworks, no CDN).
'use strict';

const PAGE_SIZE = 5;

const state = {
  day: '',
  offset: 0,
  append: false,
};

const el = (selector) => document.querySelector(selector);

function formatIst(iso) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

async function fetchJson(url, init) {
  const res = await fetch(url, init);
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

function classesUrl() {
  if (state.day) {
    return `/api/classes/day?on=${encodeURIComponent(state.day)}`;
  }
  return `/api/classes?limit=${PAGE_SIZE}&offset=${state.offset}`;
}

function renderClasses(items, append) {
  const tbody = el('#class-list tbody');
  if (!append) tbody.textContent = '';

  if (!items.length) {
    el('#classes-status').textContent = 'No classes found';
    return;
  }

  const rows = items
    .map((c) => `
      <tr data-class-id="${c.id}">
        <td class="class-title">${c.title}</td>
        <td class="starts-at">${formatIst(c.startsAt)}</td>
        <td class="coach">${c.coach}</td>
        <td class="seats">${c.bookedCount}/${c.capacity}</td>
      </tr>`)
    .join('');
  tbody.insertAdjacentHTML('beforeend', rows);

  el('#classes-status').textContent = `${tbody.querySelectorAll('tr').length} classes shown`;
}

async function loadClasses() {
  el('#classes-status').textContent = 'Loading classes…';
  const { status, data } = await fetchJson(classesUrl());
  if (status !== 200) {
    el('#classes-status').textContent = 'Could not load classes';
    return;
  }
  renderClasses(data.items, state.append);
  state.append = false;
}

async function loadPopular() {
  const { status, data } = await fetchJson('/api/classes/popular?limit=5');
  if (status !== 200) return;
  const list = el('#popular-list');
  list.textContent = '';
  for (const item of data.items) {
    const li = document.createElement('li');
    li.dataset.classId = String(item.id);
    li.textContent = `${item.title} — ${item.bookings} member${item.bookings === 1 ? '' : 's'}`;
    list.appendChild(li);
  }
}

async function loadMembers() {
  const { status, data } = await fetchJson('/api/members');
  if (status !== 200) return;
  const select = el('#booking-member');
  select.textContent = '';
  for (const member of data.items) {
    const option = document.createElement('option');
    option.value = String(member.id);
    option.textContent = `${member.name} (#${member.id})`;
    select.appendChild(option);
  }
}

function fillClassPicker(items) {
  const select = el('#booking-class');
  const current = select.value;
  select.textContent = '';
  for (const item of items) {
    const option = document.createElement('option');
    option.value = String(item.id);
    option.textContent = `#${item.id} ${item.title}`;
    select.appendChild(option);
  }
  if (current) select.value = current;
}

async function loadClassPicker() {
  const { status, data } = await fetchJson('/api/classes?limit=100&offset=0');
  if (status !== 200) return;
  fillClassPicker(data.items);
}

el('#day-filter').addEventListener('change', (event) => {
  state.day = event.target.value;
  state.offset = 0;
  state.append = false;
  el('#load-more').disabled = Boolean(state.day);
  loadClasses();
});

el('#load-more').addEventListener('click', () => {
  state.offset = state.offset + PAGE_SIZE + 1;
  state.append = true;
  loadClasses();
});

el('#booking-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const classId = Number(el('#booking-class').value);
  const memberId = Number(el('#booking-member').value);
  el('#booking-status').textContent = 'Booking…';
  const { status, data } = await fetchJson('/api/bookings', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ classId, memberId }),
  });
  if (status === 201) {
    el('#booking-status').textContent = `Booked: booking #${data.booking.id}`;
    await loadClasses();
    await loadPopular();
  } else {
    el('#booking-status').textContent = `Booking failed (${data && data.error ? data.error.code : status})`;
  }
});

async function boot() {
  await Promise.all([loadMembers(), loadPopular(), loadClassPicker()]);
  await loadClasses();
}

boot();
