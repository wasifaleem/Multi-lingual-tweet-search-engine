var Search = React.createClass({
    getInitialState: function () {
        return {jqXHR: null, results: {}, query: ""};
    },
    handleQuery: function (event) {
        if (event.type === 'submit') {
            event.preventDefault();
        } else {
            var oldQuery = this.state.query;
            var newQuery = event.target.value;
            console.log(newQuery);
            this.setState({query: newQuery});
            this.fetchResults(oldQuery, newQuery, this.state.jqXHR)
        }
    },
    fetchResults: function (oldQuery, newQuery, jqXHR) {
        //if (newQuery != null && newQuery.length > 3) {
        if (newQuery != null) {
            if (jqXHR && jqXHR.readyState !== 4) {
                jqXHR.abort();
            }
            this.setState({
                jqXHR: $.ajax({
                    url: 'http://localhost:8983/solr/tweets/query?hl=true&hl.fragsize=0&hl.simple.pre=<b>&hl.simple.post=</b>',
                    type: 'POST',
                    //dataType: "json",
                    contentType: "application/json; charset=utf-8",
                    data: JSON.stringify({query: newQuery}),
                    success: function (response) {
                        console.log(response);
                        this.setState({results: response});
                    }.bind(this),
                    error: function (xhr, status, err) {
                        console.error(xhr.responseText);
                    }.bind(this)
                })
            });
        } else {
            this.setState({results: {}});
        }
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
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-md-6 col-md-offset-3">
                            <Search.ResultList results={this.state.results}/>
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-md-3">
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
        var results = this.props.results;
        if (results.hasOwnProperty('response') && results.response.docs && results.response.docs.length > 0) {
            var tweets = results.response.docs;
            var resultNodes = tweets.map(function (tweet) {
                return (
                    <div>
                        <Search.Tweet key={tweet.id} tweet={tweet} query={query} results={results}/>
                        <hr key={'hr' +tweet.id}/>
                    </div>
                );
            });
            return (
                <div className="tweet-block">
                    {resultNodes}
                </div>
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
        var highlights = this.props.results.highlighting;
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