import { shallowMount } from '@vue/test-utils';
import Details from './Details.vue';

describe('Details', () => {
  it('renders as expected', () => {
    const wrapper = shallowMount(Details, {
      propsData: {
        details: {
          from: 'scammer@spamsite.xyz',
          subject: 'FREE corona 4 u',
          tags: ['virus', 'scarewords'],
          suspicion: 0.201,
          body: 'this is a fake email body!',
        },
        keywords: {
          virus: {
            description: 'Concerning viruses and disease transmission',
            keywords: ['covid19', 'flu', 'pneumonia'],
          },
          scarewords: {
            description: "Intended to lower the reader's guard",
            keywords: ['act now', 'danger', 'immediate'],
          },
        },
      },
    });
    expect(wrapper.html()).toMatchInlineSnapshot(`
      <div class="details">
        <h1>Details</h1>
        <b-row>
          <b-col cols="4" class="left">Date</b-col>
          <b-col cols="8" class="right"></b-col>
        </b-row>
        <b-row>
          <b-col cols="4" class="left">From</b-col>
          <b-col cols="8" class="right">scammer@spamsite.xyz</b-col>
        </b-row>
        <b-row class="evenRow">
          <b-col cols="4" class="left">Subject</b-col>
          <b-col cols="8" class="right">FREE corona 4 u</b-col>
        </b-row>
        <b-row class="tags">
          <b-col cols="4" class="left">Tags</b-col>
          <b-col cols="8" class="right"><span><details><summary>virus</summary> <p>Concerning viruses and disease transmission</p> <p>
                  Includes: <em>covid19, flu, pneumonia</em></p></details><details><summary>scarewords</summary> <p>Intended to lower the reader's guard</p> <p>
                  Includes: <em>act now, danger, immediate</em></p></details></span></b-col>
        </b-row>
        <b-row class="evenRow">
          <b-col cols="4" class="left">Suspicion</b-col>
          <b-col cols="8" class="right">0.201</b-col>
        </b-row>
        <b-row>
          <b-col cols="4" class="left">Body</b-col>
          <b-col cols="8" class="right">this is a fake email body!</b-col>
        </b-row>
      </div>
    `);
  });
});
