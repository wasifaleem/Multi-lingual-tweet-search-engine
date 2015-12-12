var Search = React.createClass({
    getInitialState: function () {
        return {jqXHR: null, response: {}, query: "", currentCursor: 1, cursors: {1: "*"}};
    },
    handleQuery: function (event) {
        if (event.type === 'submit') {
            event.preventDefault();
        } else {
            var oldQuery = this.state.query;
            var newQuery = event.target.value;
            this.setState({query: newQuery}, function () {
                this.setState({currentCursor: 1, cursors: {1: "*"}});
                this.fetchResults(oldQuery);
            });
        }
    },
    buildQuery: function () {
        return JSON.stringify({
            query: this.state.query,
            facet: {
                hashtag: {terms: 'tweet_hashtags'},
                lang: {terms: 'lang'}
            }
        });
    },
    buildURL: function () {
        return 'http://localhost:8983/solr/tweets/query?hl=true' +
            '&hl.fragsize=0&hl.simple.pre=<b>&rows=10&hl.simple.post=</b>' +
            '&cursorMark=' + this.state.cursors[this.state.currentCursor] + '&sort=score desc, id asc';
    },
    fetchResults: function (oldQuery) {
        console.log(this.state.query);
        //if (newQuery != null && newQuery.length > 3) {
        if (this.state.query != null) {
            if (this.state.jqXHR && this.state.jqXHR.readyState !== 4) {
                this.state.jqXHR.abort();
            }
            this.setState({
                jqXHR: $.ajax({
                    url: this.buildURL(),
                    type: 'POST',
                    contentType: "application/json; charset=utf-8",
                    data: this.buildQuery(),
                    success: function (response) {
                        console.log(response);
                        this.updateStateOnResponse(response);
                    }.bind(this),
                    error: function (xhr, status, err) {
                        console.error(xhr.responseText);
                    }.bind(this)
                })
            });
        } else {
            this.setState({response: {}});
        }
    },
    updateStateOnResponse: function (response) {
        if (response.nextCursorMark
            && response.nextCursorMark !== "*"
            && response.nextCursorMark !== this.state.cursors[this.state.currentCursor]
            && response.hasOwnProperty('response')
            && response.response.docs
            && response.response.docs.length === 10) {
            this.state.cursors[this.state.currentCursor + 1] = response.nextCursorMark;
        }
        this.setState({response: response});
    },
    handlePager: function (e) {
        var cursors = this.state.cursors;
        var currentCursor = this.state.currentCursor;
        var cursorsLength = Object.keys(cursors).length;
        switch (e.target.textContent) {
            case "Next":
                if ((currentCursor + 1) <= cursorsLength) {
                    this.setState({currentCursor: (currentCursor + 1)}, function () {
                        this.fetchResults();
                    });
                }
                break;
            case "Prev":
                if ((currentCursor - 1) >= 1) {
                    this.setState({currentCursor: (currentCursor - 1)}, function () {
                        this.fetchResults();
                    });
                }
                break
        }
        jQuery('html,body').animate({scrollTop: 0}, 0);
    },
    render: function () {
        return (
            <div>
                <div>
                    <div className="navbar bg-faded">
                        <form className="form-inline ">
                            <div className="form-group">
                                <div className="input-group">
                                    <input autoFocus className="form-control" type="text"
                                           value={this.state.query} onChange={this.handleQuery}
                                           placeholder="Type your query"/>
                                    <div className="input-group-addon">
                                        <i className="fa fa-search"/>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
                <div className="container-fluid">
                    <div className="row">
                        <div className="col-md-3">
                            <Search.LangFacet response={this.state.response}/>
                        </div>
                        <div className="col-md-6">
                            <Search.ResultList response={this.state.response}/>
                            <Search.ResultPager onClick={this.handlePager} currentCursor={this.state.currentCursor}
                                                cursors={this.state.cursors}/>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
});

Search.ResultList = React.createClass({
    render: function () {
        var query = this.props.query;
        var response = this.props.response;
        if (response.hasOwnProperty('response') && response.response.docs && response.response.docs.length > 0) {
            var tweets = response.response.docs;
            var resultNodes = tweets.map(function (tweet) {
                return (
                    <div key={tweet.id}>
                        <Search.Tweet key={tweet.id} tweet={tweet} query={query} response={response}/>
                        <hr />
                    </div>
                );
            });
            return (
                <div>
                    <div className="tweet-block">
                        {resultNodes}
                    </div>
                </div>
            );
        }
        return (
            <div></div>
        );
    }
});

Search.ResultPager = React.createClass({
    render: function () {
        var currentCursor = this.props.currentCursor;
        console.log(currentCursor);
        var cursors = this.props.cursors;
        console.log(cursors);
        var cursorsLength = Object.keys(cursors).length;
        if (cursorsLength >= 1) {
            var isPrevious = (currentCursor - 1) >= 1;
            var isNext = (currentCursor + 1) <= cursorsLength;
            return (
                <nav>
                    <ul className="pager">
                        {isPrevious ? <li className="pager-prev"><a onClick={this.props.onClick}>Prev</a></li> : null}
                        {isNext ? <li className="pager-next"><a onClick={this.props.onClick}>Next</a></li> : null}
                    </ul>
                </nav>
            );
        }
        return (
            <div></div>
        );
    }
});

Search.LangFacet = React.createClass({
    render: function () {
        var response = this.props.response;
        if (response.hasOwnProperty('facets') && response.facets.lang && response.facets.lang.buckets.length > 0) {
            var langs = response.facets.lang.buckets;
            var resultNodes = langs.map(function (lang) {
                console.log(lang);
                return (
                    <li key={lang.val} className="list-group-item">{lang.val}
                        <span className="label label-default label-pill pull-xs-left">{lang.count}</span>
                    </li>
                );
            });
            return (
                <ul className="list-group">
                    {resultNodes}
                </ul>
            );
        }
        return (
            <div></div>
        );
    }
});

Search.Tweet = React.createClass({
    render: function () {
        var query = this.props.query;
        var tweet = this.props.tweet;
        var highlights = this.props.response.highlighting;
        var tweetText = tweet.text;
        if (highlights[tweet.id] && highlights[tweet.id].text) {
            tweetText = highlights[tweet.id].text[0];
        }
        return (
            <div className="row tweet">
                <div className="col-md-1">
                    <img className="tweet-profile-image" src={tweet["user.profile_image"]} onError={function(e) {
                        e.target.src = 'https://abs.twimg.com/sticky/default_profile_images/default_profile_6_normal.png';
                    }}/>
                </div>
                <div className="col-md-11 ">
                    <h6 className="tweet-title">
                        <strong>{tweet["user.name"]}</strong>
                        <small className="text-muted"> @{tweet["user.screen.name"]}</small>
                    </h6>
                    <p className="tweet-text" ref={function(t) {if (t!=null){linkifyElement(t)}}}
                       dangerouslySetInnerHTML={{__html: tweetText}}/>
                </div>
            </div>
        );
    }
});

ReactDOM.render(
    <Search />,
    document.getElementById('content')
);