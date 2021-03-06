import { shallowMount } from '@vue/test-utils';
import Summary from './Summary.vue';

describe('Summary', () => {
  it('renders as expected', () => {
    const wrapper = shallowMount(Summary, {
      propsData: {
        brief: {
          from: 'scammer@spamsite.xyz',
          subject: 'FREE corona 4 u',
          tags: ['virus', 'scarewords'],
        },
      },
    });
    expect(wrapper.html()).toMatchInlineSnapshot(`
      <div class="card">
        <p class="name"></p>
        <p class="email">scammer@spamsite.xyz</p>
        <p class="subject">FREE corona 4 u</p>
        <div><span class="tag">
            virus
          </span><span class="tag">
            scarewords
          </span></div>
      </div>
    `);
  });
});
