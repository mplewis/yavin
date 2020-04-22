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
        <Summary />
        <Summary />
        <Summary />
      </b-col>
      <b-col cols="8">details</b-col>
    </b-row>
  </b-container>
</template>

<script lang="ts">
import Vue from 'vue';
import Component from 'vue-class-component';
import Summary from '../components/Summary.vue';

@Component({
  components: { Summary },
})
export default class Inbox extends Vue {
}
</script>

<style lang="stylus">
nav {
  width: 100%
}
</style>
