<template>
  <b-container>
    <b-row>
      <b-navbar>
        <b-navbar-brand href="#">Yavin</b-navbar-brand>
        <b-navbar-toggle target="nav-collapse" />
        <b-collapse id="nav-collapse" is-nav>
          <b-navbar-nav>
            <b-nav-item>Suspicious</b-nav-item>
            <b-nav-item>Clean</b-nav-item>
            <b-nav-item>To Analyze</b-nav-item>
            <b-nav-item>Everything</b-nav-item>
          </b-navbar-nav>
        </b-collapse>
      </b-navbar>
    </b-row>
    <b-row>
      <b-col cols="4">
        <Summary :brief="details" />
        <Summary :brief="details" />
        <Summary :brief="details" />
      </b-col>
      <b-col cols="8">
        <Details :details="details" />
      </b-col>
    </b-row>
  </b-container>
</template>

<script lang="ts">
import Vue from 'vue';
import Component from 'vue-class-component';
import Summary from '../components/Summary.vue';
import Details from '../components/Details.vue';

@Component({
  components: { Summary, Details }
})
export default class Inbox extends Vue {
  details = {
    from: 'scammer@spamsite.xyz',
    subject: 'FREE corona 4 u',
    tags: ['virus', 'scarewords'],
    suspicion: 0.201,
    body: 'this is a fake email body!'
  };
}
</script>

<style lang="stylus">
nav {
  width: 100%
}
</style>
