<template>
  <b-container>
    <b-row>
      <b-navbar>
        <b-navbar-brand @click="setFilter(null)" href="#">Yavin</b-navbar-brand>
        <b-navbar-toggle target="nav-collapse" />
        <b-collapse id="nav-collapse" is-nav>
          <b-navbar-nav>
            <b-nav-item
              @click="setFilter(null)"
              :class="{ active: filter === null }"
            >
              Everything
            </b-nav-item>
            <b-nav-item
              @click="setFilter('suspicious')"
              :class="{ active: filter === 'suspicious' }"
            >
              Suspicious
            </b-nav-item>
            <b-nav-item
              @click="setFilter('clean')"
              :class="{ active: filter === 'clean' }"
            >
              Clean
            </b-nav-item>
          </b-navbar-nav>
        </b-collapse>
      </b-navbar>
    </b-row>
    <b-row>
      <b-col cols="4">
        <b-row class="paginator">
          <b-col>
            <button @click="prevPage" :disabled="!canPrevPage">&laquo;</button>
            <span class="status"
              >{{ pageStart + 1 }} to {{ pageEnd }} of {{ messageCount }}</span
            >
            <button @click="nextPage" :disabled="!canNextPage">&raquo;</button>
          </b-col>
        </b-row>
        <span v-if="messages">
          <b-row v-for="(message, i) in messages" :key="i">
            <b-col>
              <Summary
                :brief="message"
                :selected="i === currMessageIndex"
                @click="show(i)"
              />
            </b-col>
          </b-row>
        </span>
        <b-row v-else>
          <b-col>
            <p class="loading">Loading...</p>
          </b-col>
        </b-row>
      </b-col>
      <b-col cols="8">
        <Details v-if="message" :keywords="keywords" :details="message" />
        <p v-else>Select a message to view.</p>
      </b-col>
    </b-row>
  </b-container>
</template>

<script lang="ts">
// HACK: Vue can't find the window.fetch type
import { fetch } from 'whatwg-fetch';
import { Vue, Component } from 'vue-property-decorator';
import { stringify } from 'query-string';
import { EmailResponse } from '../types';
import Summary from '../components/Summary.vue';
import Details from '../components/Details.vue';
import { Keywords, StrStr } from '../../../src/types';

/**
 * Number of times to retry getting emails
 */
const MAX_ATTEMPTS = 3;
/**
 * Number of email summaries to show per page
 */
const PAGE_SIZE = 8;

type OptionalQueryParams = { [k: string]: string | number | null };
function urlWithQs(url: string, queryParams: OptionalQueryParams): string {
  const toKeep: StrStr = {};
  Object.entries(queryParams).forEach(([k, v]) => {
    if (v !== null) toKeep[k] = v.toString();
  });
  return `${url}?${stringify(toKeep)}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchJsonRetry(url: string): Promise<any> {
  /* eslint-disable no-await-in-loop */
  let attempts = 0;
  do {
    try {
      const resp = await fetch(url);
      const data = await resp.json();
      return data;
    } catch (e) {
      attempts += 1;
      console.warn(`Attempt ${attempts} failed: ${url}`);
    }
  } while (attempts < MAX_ATTEMPTS);
  throw new Error(`Failed to load after ${MAX_ATTEMPTS} attempts: ${url}`);
  /* eslint-enable no-await-in-loop */
}

async function loadKeywords(): Promise<Keywords> {
  return fetchJsonRetry('//localhost:9999/keywords');
}

async function loadPageCount(filter: string | null): Promise<number> {
  const url = urlWithQs('//localhost:9999/emails/count', { filter });
  return fetchJsonRetry(url);
}

async function loadEmails(
  filter: string | null,
  page: number,
): Promise<EmailResponse[]> {
  const url = urlWithQs('//localhost:9999/emails', {
    filter,
    offset: page * PAGE_SIZE,
    limit: PAGE_SIZE,
  });
  const data = await fetchJsonRetry(url);
  return data as EmailResponse[];
}

@Component({
  components: { Summary, Details },
})
export default class Inbox extends Vue {
  filter: string | null = null;

  keywords: Keywords = {};

  pagesOfMessages: EmailResponse[][] = [];

  currMessageIndex: number | null = null;

  page = 0;

  messageCount = 0;

  pageCount = 0;

  get pageStart(): number {
    return PAGE_SIZE * this.page;
  }

  get pageEnd(): number {
    return Math.min(PAGE_SIZE * (this.page + 1), this.messageCount);
  }

  get canPrevPage(): boolean {
    return this.page > 0;
  }

  get canNextPage(): boolean {
    return this.page < this.pageCount - 1;
  }

  get messages(): EmailResponse[] {
    return this.pagesOfMessages[this.page];
  }

  get message(): EmailResponse | null {
    if (this.currMessageIndex === null) return null;
    const page = this.pagesOfMessages[this.page];
    if (!page) return null;
    return page[this.currMessageIndex];
  }

  async mounted(): Promise<void> {
    loadKeywords().then((keywords) => {
      this.keywords = keywords;
    });
    this.reloadEverything();
  }

  async reloadEverything(): Promise<void> {
    this.page = 0;
    this.pagesOfMessages = [];
    this.currMessageIndex = null;
    this.messageCount = await loadPageCount(this.filter);
    this.pageCount = Math.ceil(this.messageCount / PAGE_SIZE);
    await this.loadPage(this.page);
  }

  async loadPage(page: number): Promise<void> {
    this.deselect();
    this.page = page;
    if (this.messages) return;
    const pageData = await loadEmails(this.filter, page);
    this.pagesOfMessages[this.page] = pageData;
    this.$set(this.pagesOfMessages, this.page, pageData);
  }

  setFilter(filter: string | null): void {
    this.filter = filter;
    this.reloadEverything();
  }

  show(i: number): void {
    if (!this.messages) return;
    this.currMessageIndex = i;
  }

  deselect(): void {
    this.currMessageIndex = null;
  }

  nextPage(): void {
    if (!this.canNextPage) return;
    this.loadPage(this.page + 1);
  }

  prevPage(): void {
    if (!this.canPrevPage) return;
    this.loadPage(this.page - 1);
  }
}
</script>

<style lang="stylus">
bright-blue = #3498db; // Flat UI Colors: Peter River
dark-blue = #2980b9; // Flat UI Colors: Belize Hole

nav {
  width: 100%;
}

.loading {
  font-style: italic;
}

.paginator {
  text-align: center;
  margin-bottom: 8px;

  .status {
    display: inline-block;
    min-width: 120px;
    margin-left: 8px;
    margin-right: 8px;
  }

  button {
    border: none;
    border-radius: 4px;
    color: white;
    font-weight: 800;
    padding: 3px 10px;
    background: bright-blue;

    &:hover {
      background: dark-blue;
    }

    &:disabled {
      color: rgba(0, 0, 0, 0.2);
      background-color: rgba(0, 0, 0, 0.1);
    }
  }
}
</style>
